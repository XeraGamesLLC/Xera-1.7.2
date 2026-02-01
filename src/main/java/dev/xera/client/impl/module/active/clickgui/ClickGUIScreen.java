package dev.xera.client.impl.module.active.clickgui;

import net.minecraft.client.gui.GuiScreen;
import net.minecraft.client.gui.ScaledResolution;
import org.lwjgl.input.Keyboard;
import org.lwjgl.input.Mouse;
import org.lwjgl.opengl.GL11;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.active.ClickGUI;
import dev.xera.client.impl.module.active.clickgui.elements.Panel;

import java.util.ArrayList;
import java.util.List;

public class ClickGUIScreen extends GuiScreen {

    private static ClickGUIScreen instance;
    private final List<Panel> panels = new ArrayList<>();

    // Evil color scheme
    public static final int COLOR_BG_DARK = 0xFF0A0A0C;
    public static final int COLOR_BG_PANEL = 0xFF121215;
    public static final int COLOR_BG_ELEMENT = 0xFF1A1A1F;
    public static final int COLOR_BG_HOVER = 0xFF252530;
    public static final int COLOR_ACCENT = 0xFFCC1A1A;
    public static final int COLOR_ACCENT_DIM = 0xFF8C1515;
    public static final int COLOR_ACCENT_GLOW = 0x40CC1A1A;
    public static final int COLOR_TEXT = 0xFFE0E0E0;
    public static final int COLOR_TEXT_DIM = 0xFF707070;
    public static final int COLOR_BORDER = 0xFF2A2A30;

    protected ClickGUIScreen() {
        int columns = 3;
        int panelWidth = 120;
        int panelSpacing = 8;
        int startX = 20;
        int startY = 30;

        int col = 0;
        int[] colHeights = new int[columns];
        for (int i = 0; i < columns; i++) colHeights[i] = startY;

        for (ModuleCategory category : ModuleCategory.values()) {
            Panel panel = new Panel(category);
            panel.x = startX + (col * (panelWidth + panelSpacing));
            panel.y = colHeights[col];
            panel.width = panelWidth;

            panels.add(panel);

            colHeights[col] += 200;
            col = (col + 1) % columns;
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        // Dark evil background with vignette effect
        drawEvilBackground();

        // Draw panels
        for (Panel panel : panels) {
            panel.drawScreen(mouseX, mouseY, partialTicks);
        }

        // Scroll handling
        int scroll = Mouse.getDWheel();
        if (scroll != 0) {
            float scrollAmount = ClickGUI.scroll.getValue() * (scroll > 0 ? 1 : -1);
            panels.forEach(panel -> panel.y += scrollAmount);
        }

        // Draw title
        drawCenteredString(mc.fontRenderer, "\2478Xera Client", width / 2, 8, COLOR_ACCENT);
    }

    private void drawEvilBackground() {
        // Main dark background
        drawRect(0, 0, width, height, COLOR_BG_DARK);

        // Subtle red glow from corners
        drawGradientRect(0, 0, width / 4, height / 4, 0x20CC1A1A, 0x00000000);
        drawGradientRect(width - width / 4, height - height / 4, width, height, 0x00000000, 0x15CC1A1A);

        // Scan line effect (subtle)
        GL11.glEnable(GL11.GL_BLEND);
        for (int i = 0; i < height; i += 4) {
            drawRect(0, i, width, i + 1, 0x08000000);
        }
        GL11.glDisable(GL11.GL_BLEND);
    }

    @Override
    protected void mouseClicked(int mouseX, int mouseY, int button) {
        // Reverse iteration for proper z-ordering (top panels get clicks first)
        for (int i = panels.size() - 1; i >= 0; i--) {
            Panel panel = panels.get(i);
            if (panel.mouseClick(mouseX, mouseY, button)) {
                // Bring clicked panel to front
                panels.remove(i);
                panels.add(panel);
                return;
            }
        }
    }

    @Override
    protected void mouseMovedOrUp(int mouseX, int mouseY, int state) {
        panels.forEach(panel -> panel.mouseRelease(mouseX, mouseY, state));
    }

    @Override
    protected void keyTyped(char typedChar, int keyCode) {
        if (keyCode == Keyboard.KEY_ESCAPE) {
            mc.displayGuiScreen(null);
            return;
        }
        panels.forEach(panel -> panel.keyTyped(typedChar, keyCode));
    }

    @Override
    public boolean doesGuiPauseGame() {
        return false;
    }

    @Override
    public void onGuiClosed() {
        super.onGuiClosed();
        XeraClient.getInstance().getModuleManager().getModule(ClickGUI.class).setRunning(false);
    }

    public static ClickGUIScreen getInstance() {
        if (instance == null) {
            instance = new ClickGUIScreen();
        }
        return instance;
    }

    public static void resetInstance() {
        instance = null;
    }
}
