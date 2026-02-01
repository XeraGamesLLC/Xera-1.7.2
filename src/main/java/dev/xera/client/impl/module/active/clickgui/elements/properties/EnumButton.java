package dev.xera.client.impl.module.active.clickgui.elements.properties;

import net.minecraft.client.gui.Gui;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.module.active.clickgui.elements.Element;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class EnumButton extends Element {
    private final Property<Enum> property;

    public EnumButton(Property<Enum> property) {
        super(property.getLabel());
        this.property = property;
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        boolean hovered = isHovering(mouseX, mouseY);

        // Background
        int bgColor = hovered ? 0xFF1E1E24 : 0xFF16161A;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height), bgColor);

        // Label
        mc.fontRenderer.drawStringWithShadow(property.getLabel(), (int) x + 4, (int) y + 3, COLOR_TEXT_DIM);

        // Current value
        String value = property.getFixedValue();
        int valueWidth = mc.fontRenderer.getStringWidth(value);

        // Value box
        int boxX = (int) (x + width - valueWidth - 10);
        int boxY = (int) y + 2;
        Gui.drawRect(boxX - 2, boxY, (int) (x + width - 4), boxY + 10, COLOR_BORDER);

        // Value text in accent color
        mc.fontRenderer.drawStringWithShadow(value, boxX, (int) y + 3, COLOR_ACCENT);

        // Arrow indicators
        if (hovered) {
            mc.fontRenderer.drawStringWithShadow("\2477<", (int) (x + width - valueWidth - 18), (int) y + 3, COLOR_TEXT);
            mc.fontRenderer.drawStringWithShadow("\2477>", (int) (x + width - 6), (int) y + 3, COLOR_TEXT);
        }
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        if (isHovering(mouseX, mouseY)) {
            playClickSound();

            if (button == 0) {
                property.next();
            } else if (button == 1) {
                property.previous();
            }
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
