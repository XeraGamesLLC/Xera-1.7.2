package dev.xera.client.impl.module.active.clickgui.elements;

import net.minecraft.client.gui.Gui;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.module.Module;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.active.clickgui.ClickGUIScreen;

import static dev.xera.client.impl.module.active.clickgui.ClickGUIScreen.*;

public class Panel extends Element {

    private boolean opened = true;
    private boolean dragging = false;
    private double dragOffsetX, dragOffsetY;

    private final ModuleCategory category;
    private float headerAnimation = 0;

    public Panel(ModuleCategory category) {
        super(category.displayName);
        this.category = category;

        width = 120;
        height = 22;

        for (Module module : XeraClient.getInstance().getModuleManager().getModulesByCategory(category)) {
            elements.add(new ModuleElement(module));
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        // Handle dragging
        if (dragging) {
            x = mouseX - dragOffsetX;
            y = mouseY - dragOffsetY;
        }

        // Calculate total height
        double contentHeight = 0;
        if (opened) {
            for (Element element : elements) {
                contentHeight += element.height + 2;
            }
        }

        // Panel shadow (evil glow)
        drawShadow(x - 2, y - 2, width + 4, height + contentHeight + 6);

        // Panel background
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height + contentHeight + 4), COLOR_BG_PANEL);

        // Header
        boolean headerHovered = mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
        int headerColor = headerHovered ? COLOR_BG_HOVER : COLOR_BG_ELEMENT;
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) (y + height), headerColor);

        // Accent line on top (the evil red line)
        Gui.drawRect((int) x, (int) y, (int) (x + width), (int) y + 2, COLOR_ACCENT);

        // Category icon indicator
        drawCategoryIcon((int) x + 6, (int) y + 6);

        // Category name
        mc.fontRenderer.drawStringWithShadow(getLabel(), (int) x + 18, (int) y + 7, COLOR_TEXT);

        // Expand/collapse indicator
        String arrow = opened ? "\2477\u25BC" : "\2478\u25B6";
        mc.fontRenderer.drawStringWithShadow(arrow, (int) (x + width - 12), (int) y + 7, COLOR_TEXT_DIM);

        // Draw module elements
        if (opened) {
            double posY = y + height + 2;
            for (Element element : elements) {
                element.x = x + 2;
                element.y = posY;
                element.width = width - 4;

                element.drawScreen(mouseX, mouseY, partialTicks);

                posY += element.height + 2;
            }
        }

        // Bottom border glow when opened
        if (opened && !elements.isEmpty()) {
            Gui.drawRect((int) x, (int) (y + height + contentHeight + 2), (int) (x + width), (int) (y + height + contentHeight + 4), COLOR_BORDER);
        }
    }

    private void drawShadow(double sx, double sy, double sw, double sh) {
        // Outer glow effect
        for (int i = 0; i < 4; i++) {
            int alpha = 15 - (i * 3);
            int shadowColor = (alpha << 24) | (0xCC1A1A & 0x00FFFFFF);
            Gui.drawRect((int) (sx - i), (int) (sy - i), (int) (sx + sw + i), (int) (sy + sh + i), shadowColor);
        }
    }

    private void drawCategoryIcon(int ix, int iy) {
        // Simple colored square as category indicator
        int iconColor = getCategoryColor();
        Gui.drawRect(ix, iy, ix + 8, iy + 8, iconColor);
        Gui.drawRect(ix + 1, iy + 1, ix + 7, iy + 7, COLOR_BG_ELEMENT);
        Gui.drawRect(ix + 2, iy + 2, ix + 6, iy + 6, iconColor);
    }

    private int getCategoryColor() {
        switch (category) {
            case COMBAT: return 0xFFCC2020;
            case EXPLOITS: return 0xFFCC6620;
            case MOVEMENT: return 0xFF20CC40;
            case MISCELLANEOUS: return 0xFF20AACC;
            case WORLD: return 0xFF8844CC;
            case VISUALS: return 0xFFCC20AA;
            case ACTIVE: return 0xFFCCCC20;
            default: return COLOR_ACCENT;
        }
    }

    @Override
    public boolean mouseClick(int mouseX, int mouseY, int button) {
        boolean headerHovered = mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;

        if (headerHovered) {
            if (button == 0) {
                // Start dragging
                dragging = true;
                dragOffsetX = mouseX - x;
                dragOffsetY = mouseY - y;
                return true;
            } else if (button == 1) {
                // Toggle open/close
                opened = !opened;
                playClickSound();
                return true;
            }
        }

        if (opened) {
            for (Element element : elements) {
                if (element.mouseClick(mouseX, mouseY, button)) {
                    return true;
                }
            }
        }

        return false;
    }

    public void mouseRelease(int mouseX, int mouseY, int state) {
        dragging = false;
        if (opened) {
            elements.forEach(element -> {
                if (element instanceof ModuleElement) {
                    ((ModuleElement) element).mouseRelease(mouseX, mouseY, state);
                }
            });
        }
    }

    @Override
    public void keyTyped(char typedChar, int keyCode) {
        if (opened) {
            elements.forEach(element -> element.keyTyped(typedChar, keyCode));
        }
    }
}
