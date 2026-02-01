package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.event.impl.move.EventMoveForward;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.impl.module.miscellaneous.AutoEat;

public class AutoWalk extends ToggleableModule {
    public static boolean pause = false;

    public AutoWalk() {
        super("Auto Walk", new String[]{"autowalk", "autowalker", "whold"}, ModuleCategory.MOVEMENT);
    }

    @Override
    protected void onDisable() {
        super.onDisable();

//        if (!isNull() && !mc.gameSettings.keyBindForward.pressed) {
//            mc.thePlayer.moveForward = 0.0f;
//            mc.thePlayer.movementInput.moveForward = 0.0f;
//        }

        // mc.gameSettings.keyBindForward.pressed = false;
        pause = false;
    }

//    @EventListener
//    public void onTick(EventTick event) {
//        boolean continueForward = !AutoEat.pause && !pause;
//
//        if (continueForward) {
//            mc.thePlayer.moveForward = 1.0f;
//            mc.thePlayer.movementInput.moveForward = 1.0f;
//        }
//        //mc.gameSettings.keyBindForward.pressed = continueForward;
//    }

    @EventListener
    public void onMoveForward(EventMoveForward event) {
        event.setCancelled(!pause);
    }
}
