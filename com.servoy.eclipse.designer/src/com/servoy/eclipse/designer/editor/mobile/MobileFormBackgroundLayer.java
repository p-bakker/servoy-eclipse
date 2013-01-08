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
package com.servoy.eclipse.designer.editor.mobile;

import java.awt.Dimension;

import org.eclipse.draw2d.FreeformLayer;
import org.eclipse.draw2d.Graphics;
import org.eclipse.swt.graphics.Color;
import org.eclipse.swt.graphics.RGB;

import com.servoy.eclipse.designer.editor.BaseVisualFormEditor;
import com.servoy.eclipse.designer.editor.mobile.editparts.MobileFormLayoutManager;
import com.servoy.eclipse.model.util.ModelUtils;
import com.servoy.eclipse.ui.resource.ColorResource;

/**
 * Layer to print form background
 * 
 * @author rgansevles
 * 
 */
public class MobileFormBackgroundLayer extends FreeformLayer
{
	private static final Color BG_COLOR = ColorResource.INSTANCE.getColor(new RGB(236, 236, 236)); // TODO: use theme

	protected final BaseVisualFormEditor editorPart;

	public MobileFormBackgroundLayer(BaseVisualFormEditor editorPart)
	{
		this.editorPart = editorPart;
	}

	@Override
	protected void paintFigure(Graphics graphics)
	{
		Dimension size = ModelUtils.getEditingFlattenedSolution(editorPart.getForm()).getFlattenedForm(editorPart.getForm()).getSize();
		graphics.setBackgroundColor(BG_COLOR);
		graphics.fillRectangle(0, 0, MobileFormLayoutManager.MOBILE_FORM_WIDTH, size.height);
	}
}