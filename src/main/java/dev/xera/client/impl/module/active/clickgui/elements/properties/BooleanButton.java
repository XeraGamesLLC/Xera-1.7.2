package dev.xera.client.impl.module.active.clickgui.elements.properties;

import net.minecraft.client.gui.Gui;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.module.active.clickgui.elements.Element;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class BooleanButton extends Element {
    private final Property<Boolean> property;
    private float toggleAnimation = 0;

    public BooleanButton(Property<Boolean> property) {
        super(property.getLabel());
        this.property = property;
        this.toggleAnimation = property.getValue() ? 1.0f : 0.0f;
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        boolean hovered = isHovering(mouseX, mouseY);
        boolean enabled = property.getValue();

        // Animate toggle
        float target = enabled ? 1.0f : 0.0f;
        toggleAnimation += (target - toggleAnimation) * 0.3f;

        // Background
        int bgColor = hovered ? 0xFF1E1E24 : 0xFF16161A;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height), bgColor);

        // Label
        mc.fontRenderer.drawStringWithShadow(property.getLabel(), (int) x + 4, (int) y + 3, COLOR_TEXT_DIM);

        // Toggle switch
        int switchX = (int) (x + width - 24);
        int switchY = (int) y + 3;
        int switchWidth = 20;
        int switchHeight = 8;

        // Track background
        int trackColor = enabled ? COLOR_ACCENT_DIM : 0xFF2A2A30;
        Gui.drawRect(switchX, switchY, switchX + switchWidth, switchY + switchHeight, trackColor);

        // Knob
        int knobX = switchX + (int) ((switchWidth - 8) * toggleAnimation);
        int knobColor = enabled ? COLOR_ACCENT : 0xFF505055;
        Gui.drawRect(knobX, switchY - 1, knobX + 8, switchY + switchHeight + 1, knobColor);

        // Glow when enabled
        if (toggleAnimation > 0.5f) {
            Gui.drawRect(knobX + 1, switchY, knobX + 7, switchY + switchHeight, 0x40FFFFFF);
        }
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        if (isHovering(mouseX, mouseY) && button == 0) {
            playClickSound();
            property.setValue(!property.getValue());
            return true;
        }
        return false;
    }

    @Override
    public void keyTyped(char typedChar, int keyCode) {
    }

    @Override
    public boolean isVisible() {
        return property.isVisible();
    }
}
