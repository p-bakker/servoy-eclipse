/*
 This file belongs to the Servoy development and deployment environment, Copyright (C) 1997-2012 Servoy BV

 This program is free software; you can redistribute it and/or modify it under
 the terms of the GNU Affero General Public License as published by the Free
 Software Foundation; either version 3 of the License, or (at your option) any
 later version.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along
 with this program; if not, see http://www.gnu.org/licenses or write to the Free
 Software Foundation,Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301
 */

package com.servoy.eclipse.model;

import java.rmi.RemoteException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import com.servoy.eclipse.model.builder.ScriptingUtils;
import com.servoy.j2db.FlattenedSolution;
import com.servoy.j2db.persistence.EnumDataProvider;
import com.servoy.j2db.persistence.Form;
import com.servoy.j2db.persistence.IDataProvider;
import com.servoy.j2db.persistence.IPersist;
import com.servoy.j2db.persistence.IRootObject;
import com.servoy.j2db.persistence.IServer;
import com.servoy.j2db.persistence.ITable;
import com.servoy.j2db.persistence.NameComparator;
import com.servoy.j2db.persistence.RepositoryException;
import com.servoy.j2db.persistence.ScriptVariable;
import com.servoy.j2db.persistence.Solution;
import com.servoy.j2db.persistence.SolutionMetaData;
import com.servoy.j2db.util.Pair;
import com.servoy.j2db.util.Utils;


/**
 * This class filters out, in Developer only, things which should not be allowed, as (currently) improper usage
 * of import hooks (for instance, pre-import hooks need special attention as their objects cannot be used
 * inside the main solution)
 *
 * @author acostache
 *
 */
public class DeveloperFlattenedSolution extends FlattenedSolution
{
	private volatile Map<String, Set<Form>> formCacheByDataSource = new HashMap<String, Set<Form>>();
	private volatile Map<Form, String> formToDataSource = new HashMap<>();
	private static final String ALL_FORMS = "";

	public DeveloperFlattenedSolution(boolean cacheFlattenedForms)
	{
		super(cacheFlattenedForms);
	}

	/*
	 * When the main solution is not an in import hook, filter out all import hooks. Modules of the import hook that are not directly modules of the solution
	 * are also excluded.
	 */
	private Solution[] filterModules(String mainSolutionName, Solution[] modules)
	{
		// put modules in a map
		Map<String, Solution> map = new HashMap<String, Solution>();
		for (Solution m : modules)
		{
			if (m != null)
			{
				map.put(m.getName(), m);
			}
		}

		// find the main solution
		Solution mainSolution = map.get(mainSolutionName);
		if (mainSolution == null)
		{
			// should not happen, throw?
			return modules;
		}

		if (SolutionMetaData.isImportHook(mainSolution.getSolutionMetaData()))
		{
			// import hook has all
			return modules;
		}

		// main solution is not an import hook, filter out import hooks and their modules
		List<Solution> filteredModules = new ArrayList<Solution>();
		List<Solution> toProcess = new ArrayList<Solution>();
		toProcess.add(mainSolution);
		while (toProcess.size() > 0)
		{
			Solution solution = toProcess.remove(0);
			if (solution != null && !SolutionMetaData.isImportHook(solution.getSolutionMetaData()) && !filteredModules.contains(solution))
			{
				filteredModules.add(solution);
				for (String modName : Utils.getTokenElements(solution.getModulesNames(), ",", true))
				{
					toProcess.add(map.get(modName));
				}
			}
		}

		return filteredModules.toArray(new Solution[filteredModules.size()]);
	}

	@Override
	protected void setSolutionAndModules(String mainSolutionName, Solution[] mods) throws RemoteException
	{
		super.setSolutionAndModules(mainSolutionName, filterModules(mainSolutionName, mods));
	}

	@Override
	protected void addGlobalsScope(Map<String, Pair<String, IRootObject>> scopes)
	{
		//NOP
	}

	@Override
	protected IDataProvider getEnumDataProvider(String id) throws RepositoryException
	{
		String[] enumParts = id.split("\\.");
		if (enumParts.length > 3)
		{
			IDataProvider globalDataProvider = getGlobalDataProvider(enumParts[0] + '.' + enumParts[1] + '.' + enumParts[2]);
			if (globalDataProvider instanceof ScriptVariable && ((ScriptVariable)globalDataProvider).isEnum())
			{
				List<EnumDataProvider> enumDataProviders = ScriptingUtils.getEnumDataProviders((ScriptVariable)globalDataProvider);
				for (EnumDataProvider enumProvider : enumDataProviders)
				{
					if (enumProvider.getDataProviderID().equals(id))
					{
						return enumProvider;
					}
				}
			}
		}

		return null;
	}

	@Override
	public ITable getTable(String dataSource)
	{
		return ServoyModelFinder.getServoyModel().getDataSourceManager().getDataSource(dataSource);
	}

	@Override
	public IServer getServer(String dataSource)
	{
		return (IServer)ServoyModelFinder.getServoyModel().getDataSourceManager().getServer(dataSource);
	}

	@Override
	public synchronized void flushAllCachedData()
	{
		super.flushAllCachedData();
		formCacheByDataSource.clear();
		formToDataSource.clear();
	}

	@Override
	public void itemChanged(IPersist persist)
	{
		super.itemChanged(persist);
		if (persist instanceof Form)
		{
			updateDataSourceCache((Form)persist);
		}
	}

	private void updateDataSourceCache(Form form)
	{
		String oldDataSource = formToDataSource.get(form);
		String newDataSource = form.getDataSource() != null ? form.getDataSource() : Form.DATASOURCE_NONE;
		if (oldDataSource != null && !oldDataSource.equals(newDataSource) || oldDataSource == null && newDataSource != null)
		{
			getFormsByDatasource(oldDataSource, false).remove(form);
			getFormsByDatasource(newDataSource, false).add(form);
			formToDataSource.put(form, newDataSource);

			if (form.isFormComponent().booleanValue())
			{
				ServoyModelFinder.getServoyModel().fireFormComponentChanged();
			}
		}
	}

	@Override
	public Iterator<Form> getForms(String datasource, boolean sort)
	{
		return getFormsByDatasource(datasource, true).iterator();
	}

	private Set<Form> getFormsByDatasource(String datasource, boolean includeNone)
	{
		String ds = datasource == null ? ALL_FORMS : datasource;
		Set<Form> datasourceSet = formCacheByDataSource.get(ds);
		if (datasourceSet == null)
		{
			datasourceSet = fillSet(datasource);
			formCacheByDataSource.put(ds, datasourceSet);
		}
		if (includeNone)
		{
			Set<Form> datasourceNoneSet = formCacheByDataSource.get(Form.DATASOURCE_NONE);
			if (datasourceNoneSet == null)
			{
				datasourceNoneSet = fillSet(Form.DATASOURCE_NONE);
				formCacheByDataSource.put(Form.DATASOURCE_NONE, datasourceNoneSet);
			}
			Set<Form> result = new TreeSet<Form>(NameComparator.INSTANCE);
			result.addAll(datasourceSet);
			result.addAll(datasourceNoneSet);
			return result;
		}
		return datasourceSet;
	}

	/**
	 * @param datasource
	 * @return
	 */
	private Set<Form> fillSet(String datasource)
	{
		Set<Form> result = new TreeSet<Form>(NameComparator.INSTANCE);
		Iterator<Form> forms = super.getForms(datasource, false);
		while (forms.hasNext())
		{
			Form f = forms.next();
			result.add(f);
			formToDataSource.put(f, f.getDataSource() != null ? f.getDataSource() : Form.DATASOURCE_NONE);
		}
		return result;
	}

	@Override
	public void itemCreated(IPersist persist)
	{
		super.itemCreated(persist);
		if (persist instanceof Form)
		{
			Form form = (Form)persist;
			getFormsByDatasource(null, false).add(form);
			String ds = form.getDataSource() != null ? form.getDataSource() : Form.DATASOURCE_NONE;
			formToDataSource.put(form, ds);
			getFormsByDatasource(ds, false).add(form);

			if (form.isFormComponent().booleanValue())
			{
				ServoyModelFinder.getServoyModel().fireFormComponentChanged();
			}
		}
	}

	@Override
	public void itemRemoved(IPersist persist)
	{
		super.itemRemoved(persist);
		if (persist instanceof Form)
		{
			Form form = (Form)persist;
			getFormsByDatasource(null, false).remove(form);
			formToDataSource.remove(form);
			getFormsByDatasource(form.getDataSource() != null ? form.getDataSource() : Form.DATASOURCE_NONE, false).remove(form);

			if (form.isFormComponent().booleanValue())
			{
				ServoyModelFinder.getServoyModel().fireFormComponentChanged();
			}
		}
	}

	@Override
	protected void fillFormCaches()
	{
		super.fillFormCaches();
		if (formCacheByDataSource.isEmpty()) //cache by datasource
		{
			Set<Form> allforms = new TreeSet<Form>(NameComparator.INSTANCE);
			Iterator<Form> it = Solution.getForms(getAllObjectsAsList(), null, true);
			while (it.hasNext())
			{
				Form f = it.next();
				allforms.add(f);
				formToDataSource.put(f, f.getDataSource() != null ? f.getDataSource() : Form.DATASOURCE_NONE);

				String ds = f.getDataSource();
				if (ds == null) ds = Form.DATASOURCE_NONE;
				Set<Form> set = formCacheByDataSource.get(ds);
				if (set == null)
				{
					set = new TreeSet<>(NameComparator.INSTANCE);
					formCacheByDataSource.put(ds, set);
				}
				set.add(f);
			}
			formCacheByDataSource.put(ALL_FORMS, allforms);
		}
	}
}
