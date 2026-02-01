package dev.xera.client.impl.module.active.clickgui.elements.properties;

import net.minecraft.client.gui.Gui;
import org.lwjgl.input.Mouse;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.module.active.clickgui.elements.Element;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class NumberButton extends Element {
    private final Property<Number> property;
    private boolean dragging = false;
    private final float range;

    public NumberButton(Property<Number> property) {
        super(property.getLabel());
        this.property = property;
        this.range = property.getMax().floatValue() - property.getMin().floatValue();
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        if (dragging) {
            if (Mouse.isButtonDown(0)) {
                updateValue(mouseX);
            } else {
                dragging = false;
            }
        }

        boolean hovered = isHovering(mouseX, mouseY);

        // Background
        int bgColor = hovered ? 0xFF1E1E24 : 0xFF16161A;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height), bgColor);

        // Calculate percentage
        float percent = (property.getValue().floatValue() - property.getMin().floatValue()) / range;
        percent = Math.max(0, Math.min(1, percent));

        // Slider track background
        int trackY = (int) y + 10;
        Gui.drawRect((int) x + 4, trackY, (int) (x + width - 4), trackY + 3, COLOR_BORDER);

        // Filled portion
        int filledWidth = (int) ((width - 8) * percent);
        if (filledWidth > 0) {
            Gui.drawRect((int) x + 4, trackY, (int) x + 4 + filledWidth, trackY + 3, COLOR_ACCENT);
            // Glow effect
            Gui.drawRect((int) x + 4, trackY, (int) x + 4 + filledWidth, trackY + 1, 0x40FFFFFF);
        }

        // Slider handle
        int handleX = (int) x + 2 + filledWidth;
        Gui.drawRect(handleX, trackY - 2, handleX + 4, trackY + 5, dragging ? 0xFFFFFFFF : COLOR_ACCENT);

        // Label with value
        String valueStr = formatValue(property.getValue());
        mc.fontRenderer.drawStringWithShadow(property.getLabel(), (int) x + 4, (int) y + 1, COLOR_TEXT_DIM);

        int valueWidth = mc.fontRenderer.getStringWidth(valueStr);
        mc.fontRenderer.drawStringWithShadow(valueStr, (int) (x + width - valueWidth - 4), (int) y + 1, COLOR_TEXT);
    }

    private String formatValue(Number value) {
        if (value instanceof Integer) {
            return String.valueOf(value.intValue());
        } else if (value instanceof Double) {
            return String.format("%.1f", value.doubleValue());
        } else if (value instanceof Float) {
            return String.format("%.1f", value.floatValue());
        }
        return value.toString();
    }

    private void updateValue(int mouseX) {
        float percent = (float) ((mouseX - x - 4) / (width - 8));
        percent = Math.max(0, Math.min(1, percent));

        if (property.getValue() instanceof Double) {
            double result = property.getMin().doubleValue() + (range * percent);
            property.setValue(Math.round(result * 10.0) / 10.0);
        } else if (property.getValue() instanceof Float) {
            float result = property.getMin().floatValue() + (range * percent);
            property.setValue(Math.round(result * 10.0f) / 10.0f);
        } else if (property.getValue() instanceof Integer) {
            int result = property.getMin().intValue() + (int) (range * percent);
            property.setValue(result);
        }
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        if (isHovering(mouseX, mouseY) && button == 0) {
            dragging = true;
            updateValue(mouseX);
            playClickSound();
            return true;
        }
        return false;
    }

    public void mouseRelease() {
        dragging = false;
    }

    @Override
    public void keyTyped(char typedChar, int keyCode) {
    }

    @Override
    public boolean isVisible() {
        return property.isVisible();
    }
}
