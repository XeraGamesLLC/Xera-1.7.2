package dev.xera.client.api.config;

import dev.xera.client.core.XeraClient;
import dev.xera.client.utils.io.FileUtils;

import java.util.ArrayList;
import java.util.List;

public class ConfigManager {
    private static boolean loading = false;
    private static boolean saving = false;

    public static final List<Config> configs = new ArrayList<>();

    public static void loadConfigurations() {
        if (loading) {
            return;
        }

        loading = true;

        XeraClient.LOGGER.info("Loading configurations...");
        configs.forEach((config) -> {
            String data = null;
            if (!config.getFile().isDirectory()) {
                data = FileUtils.read(config.getFile());
            }

            try {
                config.load(data);
            } catch (Exception e) {
                XeraClient.LOGGER.error("Failed to read config " + config.getFile().getName() + ". Error is below:");
                e.printStackTrace();
            }
        });

        XeraClient.LOGGER.info("Loaded {} configurations", configs.size());
        loading = false;
    }

    public static void saveConfigurations() {
        if (saving) {
            return;
        }

        saving = true;

        XeraClient.LOGGER.info("Saving configurations...");
        configs.forEach((config) -> {
            try {
                config.save();
            } catch (Exception e) {
                XeraClient.LOGGER.error("Failed to save config " + config.getFile().getName() + ". Error is below:");
                e.printStackTrace();
            }
        });

        XeraClient.LOGGER.info("Saved {} configurations", configs.size());
        saving = false;
    }
}
