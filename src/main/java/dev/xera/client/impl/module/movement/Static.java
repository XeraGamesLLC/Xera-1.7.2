package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.impl.event.impl.move.EventMotion;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.player.MoveUtils;

public class Static extends ToggleableModule {
    public Static() {
        super("Static", new String[]{"stopmotion"}, ModuleCategory.MOVEMENT);
    }

    @EventListener
    public void onMotion(EventMotion event) {
        if (!MoveUtils.isMoving()) {
            event.x = 0.0;
            event.z = 0.0;
            mc.thePlayer.motionX = 0.0;
            mc.thePlayer.motionZ = 0.0;
        }
    }
}
