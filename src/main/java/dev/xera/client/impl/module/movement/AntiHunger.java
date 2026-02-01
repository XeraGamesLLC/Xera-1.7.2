package dev.xera.client.impl.module.movement;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.network.play.client.C03PacketPlayer;
import net.minecraft.network.play.client.C0BPacketEntityAction;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.client.EventTick;
import dev.xera.client.impl.event.impl.network.EventPacket;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class AntiHunger extends ToggleableModule {
    private final Property<Boolean> ground = new Property<>(true, "Ground Spoof", "ground", "groundspoof");
    private final Property<Boolean> sprint = new Property<>(true, "Anti Sprint", "antisprint", "nosprint");

    private boolean antiSprint = false;

    public AntiHunger() {
        super("Anti Hunger", new String[]{"antihunger", "nohunger"}, ModuleCategory.MOVEMENT);
        offerProperties(ground, sprint);
    }

    @Override
    protected void onDisable() {
        super.onDisable();
        antiSprint = true;
    }

    @EventListener
    public void onTick(EventTick event) {
        if (sprint.getValue() && !antiSprint) {
            antiSprint = true;
            mc.thePlayer.sendQueue.addToSendQueue(new C0BPacketEntityAction(mc.thePlayer, 5));
        }
    }

    @EventListener
    public void onPacket(EventPacket event) {
        if (event.getPacket() instanceof C03PacketPlayer && ground.getValue()) {
            ((C03PacketPlayer) event.getPacket()).onGround = true;
        }

        if (event.getPacket() instanceof C0BPacketEntityAction) {
            C0BPacketEntityAction packet = event.getPacket();
            if (packet.action == 4 && sprint.getValue()) {
                event.setCancelled(true);
            }
        }
    }
}
