package dev.xera.client.core;

import me.bush.eventbus.bus.EventBus;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lwjgl.opengl.Display;
import dev.xera.client.api.config.ConfigManager;
import dev.xera.client.core.versioning.Version;
import dev.xera.client.core.versioning.VersionCheck;
import dev.xera.client.impl.account.AccountManager;
import dev.xera.client.impl.command.CommandManager;
import dev.xera.client.impl.discord.DiscordRPCHandler;
import dev.xera.client.impl.manager.*;
import dev.xera.client.impl.module.ModuleManager;
import dev.xera.client.impl.waypoint.WaypointManager;
import dev.xera.client.utils.io.FileUtils;
import dev.xera.client.utils.io.SystemTrayUtils;

public class XeraClient {
    private static XeraClient INSTANCE;

    public static final String NAME = "Xera Client";
    public static final String AUTHOR = "0x11xera";
    public static final Version VERSION = new Version(
            1,
            0,
            0,
            ClientEnvironment.RELEASE);

    public static final Logger LOGGER = LogManager.getLogger(NAME);
    public static final EventBus BUS = new EventBus();

    public static long START_TIME;

    private ModuleManager moduleManager;
    private CommandManager commandManager;
    private FriendManager friendManager;
    private RotationManager rotationManager;
    private InventoryManager inventoryManager;
    private TickManager tickManager;
    private AccountManager accountManager;
    private WaypointManager waypointManager;
    private CapeManager capeManager;

    private XeraClient() {
        if (INSTANCE != null) {
            LOGGER.warn("Tried to instantiate Launcher twice");
            return;
        }

        START_TIME = System.nanoTime();

        LOGGER.info("Loading {} v{}", NAME, VERSION.getVersionString());
        if (VERSION.getEnv().equals(ClientEnvironment.DEVELOPMENT)) {
            LOGGER.info("Running in development mode, client will produce more detailed stack traces.");
        }

        if (!FileUtils.CLIENT_DIRECTORY.exists()) {
            boolean result = FileUtils.CLIENT_DIRECTORY.mkdir();
            LOGGER.info("{} created the client configuration directory", (result ? "Successfully" : "Unsuccessfully"));
        }

        LOGGER.info("Checking version...");
        // VersionCheck.check(); // TODO: show window if outdated

        SystemTrayUtils.createIcon();
        if (!SystemTrayUtils.isCreated()) {
            LOGGER.info("Couldn't create system tray icon");
        }

        // our managers
        moduleManager = new ModuleManager();
        commandManager = new CommandManager();
        friendManager = new FriendManager();
        rotationManager = new RotationManager();
        inventoryManager = new InventoryManager();
        tickManager = new TickManager();
        accountManager = new AccountManager();
        waypointManager = new WaypointManager();
        capeManager = new CapeManager();

        // load configurations
        ConfigManager.loadConfigurations();

        // set a shutdown hook for when the JVM is about to shut down
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            ConfigManager.saveConfigurations();
            DiscordRPCHandler.stop();
        }, "XeraClient-Shutdown-Thread"));

        LOGGER.info("Launched {} v{} successfully in {} ms!", NAME, VERSION, (System.nanoTime() - START_TIME) / 1000000L);

        String title = NAME + " " + VERSION.getVersionString();
        if (VersionCheck.isOutdated) {
            title += " (Outdated)";
        }

        Display.setTitle(title);
    }

    public static void launch() {
        if (INSTANCE != null) {
            LOGGER.warn("Launcher#launch() called twice");
            return;
        }

        INSTANCE = new XeraClient();
    }

    public ModuleManager getModuleManager() {
        return moduleManager;
    }

    public CommandManager getCommandManager() {
        return commandManager;
    }

    public FriendManager getFriendManager() {
        return friendManager;
    }

    public RotationManager getRotationManager() {
        return rotationManager;
    }

    public InventoryManager getInventoryManager() {
        return inventoryManager;
    }

    public TickManager getTickManager() {
        return tickManager;
    }

    public AccountManager getAccountManager() {
        return accountManager;
    }

    public WaypointManager getWaypointManager() {
        return waypointManager;
    }

    public CapeManager getCapeManager() {
        return capeManager;
    }

    public static XeraClient getInstance() {
        return INSTANCE;
    }
}
