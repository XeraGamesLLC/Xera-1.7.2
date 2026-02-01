package dev.xera.client.impl.discord;

import club.minnced.discord.rpc.DiscordEventHandlers;
import club.minnced.discord.rpc.DiscordRPC;
import club.minnced.discord.rpc.DiscordRichPresence;
import net.minecraft.client.gui.GuiMainMenu;
import net.minecraft.client.gui.GuiMultiplayer;
import net.minecraft.client.gui.GuiSelectWorld;
import net.minecraft.client.multiplayer.ServerData;
import dev.xera.client.core.XeraClient;
import dev.xera.client.utils.client.MathUtils;
import dev.xera.client.utils.client.Wrapper;

public class DiscordRPCHandler implements Wrapper {

    private static final String ID = "1467567457282560065";

    private static final String[] SPLASHES = {
            "Sending coordinates to a webhook...",
            "Griefing a players small dirt hut",
            "Carb loading on 2b2t larp",
            "Sending double the packets to do double the damage",
            "Pussying out in burrow",
            "Installing SeroXen rat...",
            "Acting like a bitch",
            "Baiting kids on a block game",
            "Installing Quasar rat...",
            "Billionare, playboy, philanthropist and CEO",
            "Throwing microwaved honeybuns on homeless people",
            "Downloading intent.store rat",
            "Crashing epearls $13 VPS",
            "Yelling at strangers on the internet",
            "CFontRenderer extends ClassLoader",
            "Injecting managed code...",
            "Stealing hometea's 32ks",
            "Block game with blocks",
            "Alpha was a fucking cornball",
            "Having Xymb send me 10k for endcrystal.me",
            "Making iWoodz mad about every little thing",
            "Better than alpha client :rofl:",
            "Dumping Future Client (587/2098)",
            "Saying \"ez\" to kids with a robotic client",
            "Placing end portal blocks on alfheim.pw",
            "Running from MedMex's AutoTNTMinecart",
            "Dragging alfheim till death",
            "Stealing Round Table Client from 29",
            "Eating panera bread",
            "Obfuscated with Paramorphism",
            "Sponsored by Memphis and Detroit",
            "smacking giants with a toothpick",
            "Smoking the Opps with an end crystal spawn egg",
            "I just flew 32 meters like a butterfly thanks to DotGod.cc!",
            "doin you're mom",
            "*yo'ure",
            "hint: i'm in your walls",
            "playing a game (the game is minecraft)",
            "Michael Littlefield lives at 20826 Barnes Road, Cranston, RI 02920",
            "i like gay black men kissing",
            "hola gordo puta",
            "RATTED BY SHRIMPS AND ENO",
            "SKIDDING NEBULA",
            "Sending request to checkip.amazonaws.com",
            "Michelle Obama is a dude",
            "What's obama's last name?",
            "do u are have stupid",
            "why did my dad leave?",
            "alfheim.pw is dead anyways why am i still on it",
            "Switching to creative mode",
            "Stacking 32ks",
            "100% profit on the stock market",
            "skidding unity games",
            "selling trolls to the government",
            "being a good person",
            "being a bad person",
            "being a neutral person"
    };

    private static final DiscordRPC discordRpc = DiscordRPC.INSTANCE;
    private static Thread discordThread;
    private static DiscordRichPresence richPresence;

    public static void start() {
        if (richPresence == null) {
            richPresence = new DiscordRichPresence();
        }

        discordRpc.Discord_Initialize(ID, new DiscordEventHandlers(), true, "");
        richPresence.startTimestamp = System.currentTimeMillis() / 1000L;

        if (discordThread == null) {
            discordThread = new Thread(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    richPresence.largeImageKey = "logo";
                    richPresence.largeImageText = "Xera Client " + XeraClient.VERSION.getVersionString();

                    String details = "No data";

                    if (dev.xera.client.impl.module.miscellaneous.DiscordRPC.showIp.getValue()) {

                        ServerData data = mc.currentServerData;
                        if (data == null || data.serverIP == null) {

                            if (mc.currentScreen instanceof GuiMainMenu) {
                                details = "In the main menu";
                            } else if (mc.currentScreen instanceof GuiMultiplayer) {
                                details = "Deciding what server to play";
                            } else if (mc.currentScreen instanceof GuiSelectWorld) {
                                details = "Deciding what world to play";
                            } else {
                                if (mc.isSingleplayer()) {
                                    details = "Playing singleplayer";
                                } else {
                                    details = "Doing god knows what";
                                }
                            }
                        } else {
                            details = "Playing on " + data.serverIP;
                        }

                    } else {
                        details = "I'm a private fuck";
                    }

                    if (!details.equals(richPresence.details)) {
                        richPresence.startTimestamp = System.currentTimeMillis() / 1000L;
                    }

                    richPresence.details = details;
                    richPresence.state = SPLASHES[MathUtils.random(0, SPLASHES.length - 1)];
                    discordRpc.Discord_UpdatePresence(richPresence);

                    try {
                        Thread.sleep(3000L);
                    } catch (InterruptedException e) {
                        //
                    }
                }
            }, "DiscordRPC-Update-Thread");
            discordThread.start();
        }

    }

    public static void stop() {
        if (discordThread != null) {
            discordThread.interrupt();
            discordThread = null;
        }

        discordRpc.Discord_Shutdown();
        discordRpc.Discord_ClearPresence();
    }

}
