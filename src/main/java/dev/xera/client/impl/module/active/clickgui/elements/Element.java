package dev.xera.client.impl.module.active.clickgui.elements;

import net.minecraft.client.audio.PositionedSoundRecord;
import net.minecraft.util.ResourceLocation;
import dev.xera.client.utils.client.Labeled;

import java.util.ArrayList;
import java.util.List;

public abstract class Element implements Labeled {
    public double x, y, width, height;
    private final String label;

    protected final List<Element> elements = new ArrayList<>();

    public Element(String label) {
        this.label = label;
    }

    public abstract void drawScreen(int mouseX, int mouseY, float partialTicks);
    public abstract boolean mouseClick(int mouseX, int mouseY, int button);
    public abstract void keyTyped(char typedChar, int keyCode);

    @Override
    public String getLabel() {
        return label;
    }

    @Override
    public String[] getAliases() {
        return new String[0];
    }

    protected boolean isHovering(int mouseX, int mouseY) {
        return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
    }

    public static void playClickSound() {
        mc.getSoundHandler().playSound(PositionedSoundRecord.func_147674_a(new ResourceLocation("minecraft:gui.button.press"), 1.0f));
    }

    public boolean isVisible() {
        return true;
    }
}
