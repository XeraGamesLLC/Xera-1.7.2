package dev.xera.client.impl.module.combat;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.network.play.client.C02PacketUseEntity;
import net.minecraft.network.play.client.C0BPacketEntityAction;
import dev.xera.client.impl.event.base.Era;
import dev.xera.client.impl.event.impl.network.EventPacket;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class WTap extends ToggleableModule {
    public WTap() {
        super("W Tap", new String[]{"wtap", "extraknockback"}, ModuleCategory.COMBAT);
    }

    @EventListener
    public void onPacket(EventPacket event) {
        if (event.getPacket() instanceof C02PacketUseEntity) {
            C02PacketUseEntity packet = event.getPacket();

            if (packet.getAction().equals(C02PacketUseEntity.Action.ATTACK)) {
                if (event.getEra().equals(Era.PRE)) {
                    mc.thePlayer.sendQueue.addToSendQueue(new C0BPacketEntityAction(mc.thePlayer, 4));
                } else {
                    mc.thePlayer.sendQueue.addToSendQueue(new C0BPacketEntityAction(mc.thePlayer, 5));

                    if (mc.thePlayer.isSprinting()) {
                        mc.thePlayer.sendQueue.addToSendQueue(new C0BPacketEntityAction(mc.thePlayer, 4));
                    }
                }
            }
        }
    }
}
