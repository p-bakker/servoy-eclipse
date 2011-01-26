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

package com.servoy.eclipse.core;

import java.util.List;

import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.Platform;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;

import com.servoy.eclipse.core.resource.PersistEditorInput;
import com.servoy.eclipse.model.ServoyModelFinder;
import com.servoy.eclipse.model.repository.SolutionSerializer;
import com.servoy.eclipse.model.util.IFileAccess;
import com.servoy.eclipse.model.util.ServoyLog;
import com.servoy.eclipse.model.util.WorkspaceFileAccess;
import com.servoy.j2db.ClientState;
import com.servoy.j2db.persistence.Form;
import com.servoy.j2db.persistence.IPersist;
import com.servoy.j2db.persistence.RepositoryException;
import com.servoy.j2db.persistence.Solution;
import com.servoy.j2db.scripting.solutionmodel.JSForm;
import com.servoy.j2db.util.Debug;

/**
 * Class that is a special interface in javascript only there in the developer that bridges between the runtime client and the developers workspace
 * 
 * @author jcompagner
 * @since 6.0
 */
public class JSDeveloperSolutionModel
{

	private final ClientState state;


	public JSDeveloperSolutionModel(ClientState state)
	{
		this.state = state;
	}

	/**
	 * Saves all changes made through the solution model into the workspace.
	 */
	public void js_save()
	{
		final IFileAccess wfa = new WorkspaceFileAccess(ResourcesPlugin.getWorkspace());
		Solution solutionCopy = state.getFlattenedSolution().getSolutionCopy();
		try
		{
			List<IPersist> allObjectsAsList = solutionCopy.getAllObjectsAsList();
			for (IPersist persist : allObjectsAsList)
			{
				SolutionSerializer.writePersist(persist, wfa, ServoyModel.getDeveloperRepository(), true, false, true);
			}
		}
		catch (RepositoryException e)
		{
			Debug.error(e);
		}
	}

	/**
	 * Saves just the give form into the developers workspace.
	 * This must be a solution created or altered form.
	 * 
	 * @param form
	 */
	public void js_save(JSForm form)
	{
		final IFileAccess wfa = new WorkspaceFileAccess(ResourcesPlugin.getWorkspace());
		Solution solutionCopy = state.getFlattenedSolution().getSolutionCopy();
		try
		{
			Form frm = solutionCopy.getForm(form.js_getName());
			if (frm == null) throw new IllegalArgumentException("JSForm is not a solution model created/altered form"); //$NON-NLS-1$

			SolutionSerializer.writePersist(frm, wfa, ServoyModel.getDeveloperRepository(), true, false, true);
		}
		catch (RepositoryException e)
		{
			Debug.error(e);
		}
	}


	public void js_showFormInEditor(JSForm jsForm)
	{
		final Form form = ServoyModelFinder.getServoyModel().getFlattenedSolution().getForm(jsForm.js_getName());
		if (form != null)
		{
			Display.getDefault().asyncExec(new Runnable()
			{
				public void run()
				{
					try
					{
						PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage().openEditor(
							new PersistEditorInput(form.getName(), form.getSolution().getName(), form.getUUID()).setNew(false),
							PlatformUI.getWorkbench().getEditorRegistry().getDefaultEditor(null,
								Platform.getContentTypeManager().getContentType(PersistEditorInput.FORM_RESOURCE_ID)).getId());
					}
					catch (PartInitException ex)
					{
						ServoyLog.logError(ex);
					}
				}
			});
		}
		else
		{
			throw new IllegalArgumentException("form " + jsForm.js_getName() + " is not a workspace stored (blueprint) form"); //$NON-NLS-1$//$NON-NLS-2$
		}
	}
}
