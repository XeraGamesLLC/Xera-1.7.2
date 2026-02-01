package dev.xera.client.impl.event.impl.render;

import net.minecraft.entity.player.EntityPlayer;
import dev.xera.client.impl.event.base.Era;
import dev.xera.client.impl.event.base.EventEraed;

public class EventRenderPlayer extends EventEraed {
    private final EntityPlayer player;

    public EventRenderPlayer(Era era, EntityPlayer player) {
        super(era);
        this.player = player;
    }

    @Override
    protected boolean isCancellable() {
        return true;
    }
}
