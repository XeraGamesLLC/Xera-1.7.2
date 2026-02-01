package dev.xera.client.impl.module.visuals;

import me.bush.eventbus.annotation.EventListener;
import net.minecraft.tileentity.TileEntityChest;
import net.minecraft.tileentity.TileEntityEnderChest;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.base.Era;
import dev.xera.client.impl.event.impl.render.EventRenderPlayer;
import dev.xera.client.impl.event.impl.render.EventRenderTileEntity;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

import static org.lwjgl.opengl.GL11.*;

public class Chams extends ToggleableModule {
    private final Property<Boolean> chests = new Property<>(true, "Chests", "containers");
    private final Property<Boolean> players = new Property<>(true, "Players");

    public Chams() {
        super("Chams", new String[]{"wallhack"}, ModuleCategory.VISUALS);
        offerProperties(chests, players);
    }

    @EventListener
    public void onRenderTileEntity(EventRenderTileEntity event) {
        if (chests.getValue()) {
            if (!(event.getTileEntity() instanceof TileEntityChest) && !(event.getTileEntity() instanceof TileEntityEnderChest)) {
                return;
            }

            if (event.getEra().equals(Era.PRE)) {
                glEnable(GL_POLYGON_OFFSET_FILL);
                glPolygonOffset(1.0f, -1500000.0f);
            } else if (event.getEra().equals(Era.POST)) {
                glPolygonOffset(1.0f, 1500000.0f);
                glDisable(GL_POLYGON_OFFSET_FILL);
            }
        }
    }

    @EventListener
    public void onRenderPlayer(EventRenderPlayer event) {
        if (players.getValue()) {
            if (event.getEra().equals(Era.PRE)) {
                glEnable(GL_POLYGON_OFFSET_FILL);
                glPolygonOffset(1.0f, -1500000.0f);
            } else if (event.getEra().equals(Era.POST)) {
                glPolygonOffset(1.0f, 1500000.0f);
                glDisable(GL_POLYGON_OFFSET_FILL);
            }
        }
    }
}
