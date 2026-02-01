package dev.xera.client.impl.module.world;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.client.gui.inventory.GuiChest;
import net.minecraft.inventory.ContainerChest;
import net.minecraft.inventory.IInventory;
import net.minecraft.item.ItemStack;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.client.Timer;

public class ChestStealer extends ToggleableModule {
    private final Property<Integer> delay = new Property<>(2, 0, 10, "Delay", "d", "time");

    private final Timer timer = new Timer();

    public ChestStealer() {
        super("Chest Stealer", new String[]{"cheststealer", "stealer"}, ModuleCategory.WORLD);
        offerProperties(delay);
    }

    @Override
    public String getTag() {
        return String.valueOf(delay.getValue());
    }

    @EventListener
    public void onTick(EventTick event) {
        if (mc.currentScreen instanceof GuiChest && mc.thePlayer.openContainer instanceof ContainerChest) {
            ContainerChest container = (ContainerChest) mc.thePlayer.openContainer;
            IInventory lower = container.getLowerChestInventory();

            if (timer.hasPassed(delay.getValue() * 50L, false)) {
                for (int i = 0; i < container.numRows * 9; ++i) {
                    ItemStack stack = lower.getStackInSlot(i);
                    if (stack == null) {
                        continue;
                    }

                    timer.resetTime();
                    mc.playerController.windowClick(container.windowId, i, 0, 1, mc.thePlayer);
                    break;
                }
            }
        }
    }
}
