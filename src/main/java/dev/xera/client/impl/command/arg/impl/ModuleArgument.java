package dev.xera.client.impl.command.arg.impl;

import dev.xera.client.core.XeraClient;
import dev.xera.client.impl.command.arg.Argument;
import dev.xera.client.impl.module.Module;

public class ModuleArgument extends Argument<Module> {
    public ModuleArgument(String name) {
        super(name, Module.class);
    }

    @Override
    public boolean parse(String part) {

        Module module = XeraClient.getInstance().getModuleManager()
                .getModuleNameMap()
                .getOrDefault(part.toLowerCase(), null);

        if (module == null) {
            return false;
        }

        setValue(module);

        return true;
    }
}
