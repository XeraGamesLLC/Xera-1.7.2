package dev.xera.client.impl.module.miscellaneous;

import dev.xera.client.api.property.Property;
import dev.xera.client.impl.discord.DiscordRPCHandler;
import dev.xera.client.impl.module.ModuleCategory;
import dev.xera.client.impl.module.ToggleableModule;

public class DiscordRPC extends ToggleableModule {
    public static final Property<Boolean> showIp = new Property<>(false, "Show IP", "showip");

    public DiscordRPC() {
        super("Discord RPC", new String[]{"discordrpc", "rpc"}, ModuleCategory.MISCELLANEOUS);
        offerProperties(showIp);

        setDrawn(false);
        setRunning(true);
    }

    @Override
    protected void onEnable() {
        super.onEnable();
        DiscordRPCHandler.start();
    }

    @Override
    protected void onDisable() {
        super.onDisable();
        DiscordRPCHandler.stop();
    }
}
