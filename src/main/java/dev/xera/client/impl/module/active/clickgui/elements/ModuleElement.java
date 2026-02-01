package dev.xera.client.impl.module.active.clickgui.elements;

import net.minecraft.client.gui.Gui;
import org.lwjgl.input.Keyboard;
import dev.xera.client.impl.module.Module;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.impl.module.active.clickgui.elements.properties.BindButton;
import dev.xera.client.impl.module.active.clickgui.elements.properties.BooleanButton;
import dev.xera.client.impl.module.active.clickgui.elements.properties.EnumButton;
import dev.xera.client.impl.module.active.clickgui.elements.properties.NumberButton;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class ModuleElement extends Element {

    private final Module module;
    private boolean opened = false;
    private boolean state = false;
    private boolean binding = false;

    // Animation
    private float enableAnimation = 0;

    public ModuleElement(Module module) {
        super(module.getLabel());
        this.module = module;
        height = 16;

        // Create property elements
        module.getPropertyMap().forEach((name, prop) -> {
            if (prop.getValue() instanceof Boolean) {
                elements.add(new BooleanButton(prop));
            } else if (prop.getValue() instanceof Number) {
                elements.add(new NumberButton(prop));
            } else if (prop.getValue() instanceof Enum) {
                elements.add(new EnumButton(prop));
            }
        });

        if (module instanceof ToggleableModule) {
            state = ((ToggleableModule) module).isRunning();
            elements.add(new BindButton((ToggleableModule) module));
        } else {
            state = true;
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        if (module instanceof ToggleableModule) {
            state = ((ToggleableModule) module).isRunning();
        }

        // Animate enable state
        float targetAnim = state ? 1.0f : 0.0f;
        enableAnimation += (targetAnim - enableAnimation) * 0.3f;

        boolean hovered = isHovering(mouseX, mouseY);

        // Background
        int bgColor = hovered ? COLOR_BG_HOVER : COLOR_BG_ELEMENT;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + 16), bgColor);

        // Enabled indicator bar on the left
        if (enableAnimation > 0.01f) {
            int barHeight = (int) (14 * enableAnimation);
            int barY = (int) y + 1 + (14 - barHeight) / 2;
            Gui.drawRect((int) x, barY, (int) x + 2, barY + barHeight, COLOR_ACCENT);
        }

        // Module name
        String displayName = binding ? "\247c[Press Key]" : getLabel();
        int textColor = state ? COLOR_TEXT : COLOR_TEXT_DIM;
        mc.fontRenderer.drawStringWithShadow(displayName, (int) x + 6, (int) y + 4, textColor);

        // Settings indicator if has properties
        if (!elements.isEmpty()) {
            String dots = opened ? "\2477\u2022\u2022\u2022" : "\2478\u2022\u2022\u2022";
            mc.fontRenderer.drawStringWithShadow(dots, (int) (x + width - 16), (int) y + 4, COLOR_TEXT_DIM);
        }

        // Keybind display
        if (module instanceof ToggleableModule) {
            int bind = ((ToggleableModule) module).getBind();
            if (bind != Keyboard.KEY_NONE) {
                String keyName = Keyboard.getKeyName(bind);
                int keyWidth = mc.fontRenderer.getStringWidth(keyName);
                mc.fontRenderer.drawStringWithShadow("\2478[" + keyName + "]",
                    (int) (x + width - keyWidth - 22), (int) y + 4, COLOR_TEXT_DIM);
            }
        }

        // Draw property elements
        if (opened) {
            height = 16;
            double posY = y + 18;

            for (Element element : elements) {
                if (!element.isVisible()) continue;

                element.x = x + 4;
                element.y = posY;
                element.width = width - 8;
                element.height = 14;

                element.drawScreen(mouseX, mouseY, partialTicks);

                posY += element.height + 2;
                height += element.height + 2;
            }
        } else {
            height = 16;
        }
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        if (binding) {
            return false; // Waiting for key input
        }

        boolean hovered = isHovering(mouseX, mouseY);

        if (hovered) {
            if (button == 0) {
                // Toggle module
                if (module instanceof ToggleableModule) {
                    ToggleableModule tm = (ToggleableModule) module;
                    tm.setRunning(!tm.isRunning());
                    state = tm.isRunning();
                }
                playClickSound();
                return true;
            } else if (button == 1) {
                // Open settings
                if (!elements.isEmpty()) {
                    opened = !opened;
                    playClickSound();
                }
                return true;
            } else if (button == 2) {
                // Middle click to bind
                if (module instanceof ToggleableModule) {
                    binding = true;
                    playClickSound();
                }
                return true;
            }
        }

        // Pass to property elements
        if (opened) {
            for (Element element : elements) {
                if (!element.isVisible()) continue;
                if (element.mouseClick(mouseX, mouseY, button)) {
                    return true;
                }
            }
        }

        return false;
    }

    public void mouseRelease(int mouseX, int mouseY, int state) {
        if (opened) {
            for (Element element : elements) {
                if (element instanceof NumberButton) {
                    ((NumberButton) element).mouseRelease();
                }
            }
        }
    }

    @Override
    public void keyTyped(char typedChar, int keyCode) {
        if (binding) {
            if (module instanceof ToggleableModule) {
                ToggleableModule tm = (ToggleableModule) module;
                if (keyCode == Keyboard.KEY_ESCAPE || keyCode == Keyboard.KEY_DELETE) {
                    tm.setBind(Keyboard.KEY_NONE);
                } else {
                    tm.setBind(keyCode);
                }
            }
            binding = false;
            return;
        }

        if (opened) {
            elements.forEach(element -> element.keyTyped(typedChar, keyCode));
        }
    }

    @Override
    protected boolean isHovering(int mouseX, int mouseY) {
        return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + 16;
    }
}
