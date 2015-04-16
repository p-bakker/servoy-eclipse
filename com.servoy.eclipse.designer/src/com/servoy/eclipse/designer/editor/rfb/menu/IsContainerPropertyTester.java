package com.servoy.eclipse.designer.editor.rfb.menu;

import org.eclipse.core.expressions.PropertyTester;

import com.servoy.eclipse.ui.property.PersistContext;
import com.servoy.j2db.persistence.LayoutContainer;

public class IsContainerPropertyTester extends PropertyTester
{

	public IsContainerPropertyTester()
	{
	}

	@Override
	public boolean test(Object receiver, String property, Object[] args, Object expectedValue)
	{
		if (receiver instanceof PersistContext)
		{
			PersistContext persistContext = (PersistContext)receiver;
			return persistContext.getPersist() instanceof LayoutContainer;
		}
		else return receiver instanceof LayoutContainer;
	}

}
