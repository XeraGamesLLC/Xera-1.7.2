package dev.xera.client.core.versioning;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.xera.client.core.ClientEnvironment;
import dev.xera.client.core.XeraClient;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class VersionCheck {
    // TODO: Set up version check URL for Xera Client
    private static final String VERSION_JSON_URL = "";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0";

    public static boolean isOutdated = false;

    public static void check() {
        if (XeraClient.VERSION.getEnv().equals(ClientEnvironment.RELEASE)) {
            String res = getResponse();
            if (res != null && !res.isEmpty()) {
                JsonObject object = new JsonParser().parse(res).getAsJsonObject();

                int major = object.get("major").getAsInt();
                int minor = object.get("minor").getAsInt();
                int patch = object.get("patch").getAsInt();
                ClientEnvironment env = ClientEnvironment.valueOf(object.get("type").getAsString());
                int rcId = object.get("rcId").getAsInt();

                Version serverVer = new Version(major, minor, patch, env).setRcId(rcId);
                if (!serverVer.getVersionString().equals(XeraClient.VERSION.getVersionString())) {
                    XeraClient.LOGGER.info("You are outdated!");
                    isOutdated = true;
                }
            }
        } else {
            XeraClient.LOGGER.info("In a client environment other than release, not checking for latest...");
        }
    }

    private static String getResponse() {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(VERSION_JSON_URL).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setRequestProperty("User-Agent", USER_AGENT);

            connection.connect();

            InputStream stream = connection.getInputStream();

            if (stream != null) {
                StringBuilder builder = new StringBuilder();

                int i;
                while ((i = stream.read()) != -1) {
                    builder.append((char) i);
                }

                return builder.toString();
            } else {
                return null;
            }
        } catch (IOException e) {
            if (XeraClient.VERSION.isDev()) {
                e.printStackTrace();
            } else {
                XeraClient.LOGGER.info("An exception occurred while fetching for the latest version");
            }
        }

        return null;
    }
}
