/*
 This file belongs to the Servoy development and deployment environment, Copyright (C) 1997-2010 Servoy BV

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
package com.servoy.eclipse.ui.property;

import org.eclipse.jface.viewers.CellEditor;
import org.eclipse.jface.viewers.IFilter;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;

import com.servoy.eclipse.model.ServoyModelFinder;
import com.servoy.eclipse.model.util.ModelUtils;
import com.servoy.eclipse.ui.dialogs.RelationContentProvider;
import com.servoy.eclipse.ui.dialogs.RelationContentProvider.RelationsWrapper;
import com.servoy.eclipse.ui.editors.IValueEditor;
import com.servoy.eclipse.ui.editors.ListSelectCellEditor;
import com.servoy.eclipse.ui.labelproviders.RelationLabelProvider;
import com.servoy.eclipse.ui.labelproviders.SolutionContextDelegateLabelProvider;
import com.servoy.eclipse.ui.util.EditorUtil;
import com.servoy.j2db.persistence.ITable;


/**
 * Property controller for selecting relations in Properties view.
 *
 * @author rgansevles
 *
 */
public class RelationPropertyController extends PropertyController<String, Object>
{
	private final ITable primaryTable;
	private final ITable foreignTable;
	private final boolean includeNone;
	private final boolean includeNested;
	private final PersistContext persistContext;

	public RelationPropertyController(Object id, String displayName, PersistContext persistContext, ITable primaryTable, ITable foreignTable,
		boolean includeNone, boolean includeNested)
	{
		super(id, displayName);
		this.persistContext = persistContext;
		this.primaryTable = primaryTable;
		this.foreignTable = foreignTable;
		this.includeNone = includeNone;
		this.includeNested = includeNested;
		setLabelProvider(new SolutionContextDelegateLabelProvider(RelationLabelProvider.INSTANCE_ALL_NO_IMAGE, persistContext.getContext()));
		setSupportsReadonly(true);
	}

	@Override
	protected IPropertyConverter<String, Object> createConverter()
	{
		return new RelationNameConverter(ModelUtils.getEditingFlattenedSolution(persistContext.getPersist(), persistContext.getContext()));
	}

	@Override
	public CellEditor createPropertyEditor(Composite parent)
	{
		return new RelationPropertyEditor(parent, persistContext, primaryTable, foreignTable, includeNone, includeNested, isReadOnly());
	}

	public static class RelationPropertyEditor extends ListSelectCellEditor
	{
		public RelationPropertyEditor(Composite parent, PersistContext persistContext, ITable primaryTable, final ITable foreignTable, boolean includeNone,
			boolean includeNested, boolean isReadOnly)
		{
			super(parent, "Select relation",
				new RelationContentProvider(ModelUtils.getEditingFlattenedSolution(persistContext.getPersist(), persistContext.getContext()),
					persistContext.getContext()),
				new SolutionContextDelegateLabelProvider(RelationLabelProvider.INSTANCE_LAST_NAME_ONLY, persistContext.getContext()),
				RelationValueEditor.INSTANCE, isReadOnly,
				new RelationContentProvider.RelationListOptions(primaryTable, foreignTable, includeNone, includeNested), SWT.NONE, null,
				"selectRelationDialog");
			setShowFilterMenu(true);

			setSelectionFilter(new IFilter()
			{
				public boolean select(Object toTest)
				{
					if (toTest == RelationContentProvider.NONE)
					{
						return true;
					}
					if (toTest instanceof RelationsWrapper && ((RelationsWrapper)toTest).relations != null && ((RelationsWrapper)toTest).relations.length > 0)
					{
						return foreignTable == null || foreignTable.equals(ServoyModelFinder.getServoyModel().getDataSourceManager().getDataSource(
							((RelationsWrapper)toTest).relations[((RelationsWrapper)toTest).relations.length - 1].getForeignDataSource()));
					}
					return false;
				}
			});
		}
	}

	public static class RelationValueEditor implements IValueEditor<Object>
	{
		public static final RelationValueEditor INSTANCE = new RelationValueEditor();

		public void openEditor(Object value)
		{
			EditorUtil.openRelationEditor(((RelationsWrapper)value).relations[((RelationsWrapper)value).relations.length - 1]);
		}

		public boolean canEdit(Object value)
		{
			return value instanceof RelationsWrapper && ((RelationsWrapper)value).relations != null && ((RelationsWrapper)value).relations.length > 0;
		}
	}


}
