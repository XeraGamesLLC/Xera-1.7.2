package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.init.Blocks;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.event.impl.move.EventSafeWalk;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.player.PlayerUtils;
import dev.xera.client.utils.world.WorldUtils;

public class SafeWalk extends ToggleableModule {
    private final Property<Boolean> eagle = new Property<>(false, "Eagle");

    private boolean eagling = false;

    public SafeWalk() {
        super("Safe Walk", new String[]{"safewalk", "sneak"}, ModuleCategory.MOVEMENT);
        offerProperties(eagle);
    }

    @Override
    protected void onDisable() {
        super.onDisable();

        if (!isNull() && eagling) {
            mc.gameSettings.keyBindSneak.pressed = false;
        }

        eagling = false;
    }

    @EventListener
    public void onTick(EventTick event) {
        if (eagle.getValue()) {
            eagling = WorldUtils.getBlock(PlayerUtils.getPosUnder()) == Blocks.air && mc.thePlayer.onGround;
            mc.gameSettings.keyBindSneak.pressed = eagling;
        } else {
            if (eagling) {
                mc.gameSettings.keyBindSneak.pressed = false;
                eagling = false;
            }
        }
    }

    @EventListener
    public void onSafewalk(EventSafeWalk event) {
        event.setCancelled(true);
    }
}
