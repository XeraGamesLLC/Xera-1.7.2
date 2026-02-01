package dev.xera.client.impl.manager;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.item.ItemStack;
import net.minecraft.network.play.client.C09PacketHeldItemChange;
import net.minecraft.network.play.server.S09PacketHeldItemChange;
import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.event.impl.network.EventPacket;
import dev.xera.client.utils.client.Wrapper;

public class InventoryManager implements Wrapper {
    public int serverSlot = -1;

    public InventoryManager() {
        XeraClient.BUS.subscribe(this);
    }

    @EventListener
    public void onPacket(EventPacket event) {
        if (event.getPacket() instanceof C09PacketHeldItemChange) {
            serverSlot = ((C09PacketHeldItemChange) event.getPacket()).func_149614_c();
        } else if (event.getPacket() instanceof S09PacketHeldItemChange) {
            serverSlot = ((S09PacketHeldItemChange) event.getPacket()).func_149385_c();
        }
    }

    public void sync() {
        if (serverSlot != mc.thePlayer.inventory.currentItem) {
            mc.thePlayer.sendQueue.addToSendQueue(new C09PacketHeldItemChange(mc.thePlayer.inventory.currentItem));
        }
    }

    public ItemStack getHeld() {
        if (serverSlot > 8 || serverSlot < 0) {
            serverSlot = mc.thePlayer.inventory.currentItem;
        }
        return mc.thePlayer.inventory.mainInventory[serverSlot];
    }
}
