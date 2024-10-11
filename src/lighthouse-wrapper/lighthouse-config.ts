import { OutputMode } from "lighthouse";
import { readJsonFile } from "../util/files.js";

const config = readJsonFile("./lighthouse-config.json");

export function getFormFactor(): "desktop"|"mobile" {
    return ["desktop","mobile"].includes(config["formFactor"]) ? config["formFactor"]:"desktop";
}

export function getOutputTypes(): OutputMode[] {
    let outputTypes:OutputMode[] = config["output"];
    return outputTypes.every(e => ["json", "html", "csv"].includes(e)) ? outputTypes : ['html'];
}

export function getAuditCategories(): string[] {
    let categories:string[]  = config["auditCategories"];
    return categories.every(e => ["performance","accessibility", "best-practices","seo"].includes(e)) ? categories:["performance"];
}

export function getLogLevel(): "silent" | "error" | "warn" | "info" | "verbose" {
    return ["silent", "error", "warn", "info", "verbose"].includes(config["logLevel"]) ? config["logLevel"] : "info";
}

export function getModuleLogLevel():string{
    let logLevel = {verbose:"debug",info:"info",warn:"warn",error:"error",silent:"off"}
    return logLevel[getLogLevel()];
}

export function getHeadless() : boolean {
    return config["headless"] ?? true;
}

export function getDisableGPU() : boolean {
    return config["disableGPU"] ?? true;
}

export function getURL():string{
    return config["url"];
}
