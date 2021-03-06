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
package com.servoy.eclipse.designer.internal.core;

import java.awt.Component;
import java.awt.Dimension;
import java.awt.Insets;

import javax.swing.border.Border;
import javax.swing.text.html.CSS;

import com.servoy.eclipse.core.ServoyModelManager;
import com.servoy.eclipse.core.elements.ElementFactory;
import com.servoy.eclipse.model.util.ModelUtils;
import com.servoy.j2db.IApplication;
import com.servoy.j2db.component.ComponentFactory;
import com.servoy.j2db.persistence.Form;
import com.servoy.j2db.persistence.SolutionMetaData;
import com.servoy.j2db.smart.dataui.StyledEnablePanel;
import com.servoy.j2db.util.IStyleRule;
import com.servoy.j2db.util.IStyleSheet;
import com.servoy.j2db.util.Pair;
import com.servoy.j2db.util.PersistHelper;

/**
 * Handles painting of form borders using awt printing.
 * 
 * @author rgansevles
 */

public class FormImageNotifier extends AbstractImageNotifier
{
	private final Form form;
	private static final Insets DEFAULT_INSETS = new Insets(0, 0, 0, 0);

	public FormImageNotifier(IApplication application, Form form)
	{
		super(application);
		this.form = form;
	}

	@Override
	protected Component createComponent()
	{
		Form flattenedForm = ModelUtils.getEditingFlattenedSolution(form).getFlattenedForm(form);

		Border border = ElementFactory.getFormBorder(application, flattenedForm);
		Pair<IStyleSheet, IStyleRule> formStyle = ComponentFactory.getCSSPairStyleForForm(application, flattenedForm);

		StyledEnablePanel comp = new StyledEnablePanel(application);
		comp.setBorder(border);
		comp.setOpaque(!flattenedForm.getTransparent());
		Dimension size = flattenedForm.getSize();

		// add border insets
		Insets insets = border != null ? border.getBorderInsets(comp) : DEFAULT_INSETS;
		comp.setSize(new Dimension(size.width + insets.left + insets.right, size.height + insets.top + insets.bottom));

		SolutionMetaData solution = null;
		if (ServoyModelManager.getServoyModelManager().getServoyModel().getActiveProject() != null)
		{
			solution = ServoyModelManager.getServoyModelManager().getServoyModel().getActiveProject().getSolutionMetaData();
		}
		if (solution != null && (solution.getSolutionType() == SolutionMetaData.SOLUTION || solution.getSolutionType() == SolutionMetaData.WEB_CLIENT_ONLY))
		{
			if (formStyle != null && formStyle.getRight() != null)
			{
				comp.setCssRule(formStyle.getRight());
				if (!flattenedForm.getTransparent() && formStyle.getRight().hasAttribute(CSS.Attribute.BACKGROUND_COLOR.toString()))
				{
					comp.setBackground(PersistHelper.createColorWithTransparencySupport(formStyle.getRight().getValue(CSS.Attribute.BACKGROUND_COLOR.toString())));
				}
			}
		}
		return comp;
	}
}
