package dev.xera.client.impl.module.visuals;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonPrimitive;
import me.bush.eventbus.annotation.EventListener;
import net.minecraft.block.Block;
import net.minecraft.init.Blocks;
import net.minecraft.util.Vec3;
import dev.xera.client.api.config.Config;
import dev.xera.client.api.property.Property;
import dev.xera.client.impl.event.impl.render.EventLightValue;
import dev.xera.client.impl.event.impl.render.EventAlphaMultiplier;
import dev.xera.client.impl.event.impl.render.EventRenderPass;
import dev.xera.client.impl.event.impl.render.EventBlockSide;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;
import dev.xera.client.utils.io.FileUtils;
import dev.xera.client.utils.player.PlayerUtils;

import java.util.HashSet;
import java.util.Set;

public class XRay extends ToggleableModule {
    public static XRay INSTANCE;
    public static final Set<Integer> BLOCKS = new HashSet<>();

    private final Property<Integer> opacity = new Property<>(120, 0, 255, "Opacity", "transparency");

    public XRay() {
        super("XRay", new String[]{"orefinder"}, ModuleCategory.VISUALS);
        offerProperties(opacity);

        new Config("xray_blocks.json") {
            @Override
            public void load(String element) {
                if (element == null || element.isEmpty()) {

                    // add defaults
                    BLOCKS.add(Block.getIdFromBlock(Blocks.diamond_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.diamond_block));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.iron_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.iron_block));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.lapis_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.lapis_block));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.redstone_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.redstone_block));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.emerald_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.emerald_block));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.coal_ore));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.coal_block));

                    BLOCKS.add(Block.getIdFromBlock(Blocks.end_portal));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.end_portal_frame));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.obsidian));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.portal));

                    BLOCKS.add(Block.getIdFromBlock(Blocks.chest));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.trapped_chest));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.ender_chest));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.bed));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.beacon));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.furnace));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.lit_furnace));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.anvil));
                    BLOCKS.add(Block.getIdFromBlock(Blocks.crafting_table));
                } else {

                    int[] blockIds = new Gson().fromJson(element, int[].class);
                    if (blockIds != null && blockIds.length > 0) {
                        for (int blockId : blockIds) {
                            Block block = Block.getBlockById(blockId);
                            if (block != null && !block.equals(Blocks.air)) {
                                BLOCKS.add(blockId);
                            }
                        }
                    }
                }
            }

            @Override
            public void save() {
                JsonArray arr = new JsonArray();
                BLOCKS.forEach((id) -> arr.add(new JsonPrimitive(id)));
                FileUtils.write(getFile(), arr.toString());
            }
        };

        INSTANCE = this;
    }

    @Override
    protected void onEnable() {
        super.onEnable();
        if (!isNull()) {
            reload();
        }
    }

    @Override
    protected void onDisable() {
        super.onDisable();
        mc.renderGlobal.loadRenderers();
    }

    private void reload() {
        Vec3 pos = PlayerUtils.getPosAt();
        int dist = mc.gameSettings.renderDistanceChunks * 16;
        mc.renderGlobal.markBlockRangeForRenderUpdate(
                (int) (pos.xCoord) - dist,
                (int) (pos.yCoord) - dist,
                (int) (pos.zCoord) - dist,
                (int) (pos.xCoord) + dist,
                (int) (pos.yCoord) + dist,
                (int) (pos.zCoord) + dist);
    }

    @EventListener
    public void onPutAlpha(EventAlphaMultiplier event) {
        event.a = opacity.getValue();
        event.setCancelled(true);
    }

    @EventListener
    public void onRenderBlockPass(EventRenderPass event) {
        int id = Block.getIdFromBlock(event.getBlock());
        event.setRenderPass(BLOCKS.contains(id) ? 0 : 1);
        event.setCancelled(true);
    }

    @EventListener
    public void onShouldRenderSide(EventBlockSide event) {
        int id = Block.getIdFromBlock(event.getBlock());
        event.setCancelled(BLOCKS.contains(id));
    }

    @EventListener
    public void onBlockLightValue(EventLightValue event) {
        event.setLightValue(100000);
        event.setCancelled(true);
    }

}
