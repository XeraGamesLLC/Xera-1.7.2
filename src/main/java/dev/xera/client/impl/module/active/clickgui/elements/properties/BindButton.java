package dev.xera.client.impl.module.active.clickgui.elements.properties;

import net.minecraft.client.gui.Gui;
import org.lwjgl.input.Keyboard;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.impl.module.active.clickgui.elements.Element;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class BindButton extends Element {
    private final ToggleableModule module;
    private boolean listening = false;

    public BindButton(ToggleableModule module) {
        super("Keybind");
        this.module = module;
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        boolean hovered = isHovering(mouseX, mouseY);

        // Background
        int bgColor = hovered ? 0xFF1E1E24 : 0xFF16161A;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height), bgColor);

        // Label
        mc.fontRenderer.drawStringWithShadow("Keybind", (int) x + 4, (int) y + 3, COLOR_TEXT_DIM);

        // Current bind or listening state
        String bindText;
        int bindColor;

        if (listening) {
            bindText = "...";
            bindColor = COLOR_ACCENT;

            // Pulsing border when listening
            long pulse = System.currentTimeMillis() % 1000;
            int pulseAlpha = (int) (40 + 30 * Math.sin(pulse / 1000.0 * Math.PI * 2));
            int pulseColor = (pulseAlpha << 24) | (COLOR_ACCENT & 0x00FFFFFF);
            Gui.drawRect((int) x, (int) y, (int) (x + width), (int) y + 1, pulseColor);
            Gui.drawRect((int) x, (int) (y + height - 1), (int) (x + width), (int) (y + height), pulseColor);
        } else {
            int bind = module.getBind();
            if (bind == Keyboard.KEY_NONE) {
                bindText = "None";
                bindColor = COLOR_TEXT_DIM;
            } else {
                bindText = Keyboard.getKeyName(bind);
                bindColor = COLOR_TEXT;
            }
        }

        // Bind value box
        int valueWidth = mc.fontRenderer.getStringWidth(bindText);
        int boxX = (int) (x + width - valueWidth - 10);
        Gui.drawRect(boxX - 2, (int) y + 2, (int) (x + width - 4), (int) y + 12, COLOR_BORDER);
        mc.fontRenderer.drawStringWithShadow(bindText, boxX, (int) y + 3, bindColor);
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        if (isHovering(mouseX, mouseY) && button == 0) {
            playClickSound();
            listening = !listening;
            return true;
        }
        return false;
    }

    @Override
    public void keyTyped(char typedChar, int keyCode) {
        if (listening) {
            listening = false;

            if (keyCode == Keyboard.KEY_ESCAPE || keyCode == Keyboard.KEY_DELETE) {
                module.setBind(Keyboard.KEY_NONE);
            } else {
                module.setBind(keyCode);
            }
        }
    }
}
