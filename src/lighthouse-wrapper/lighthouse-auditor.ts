import * as ChromeLauncher from 'chrome-launcher';
import lighthouse, { Config, Flags, RunnerResult } from "lighthouse";
import fs from 'fs';
import { logger } from '../util/logger.js';
import * as path from 'path';
import { validateDirectoryPath } from '../util/files.js';
import { calculateMedian, getRandomUUID } from '../util/random.js';
import { getFormFactor, getOutputTypes, getAuditCategories, getLogLevel, getHeadless, getDisableGPU } from './lighthouse-config.js';
import mobileConfig from 'lighthouse/core/config/lr-mobile-config.js';
import { Cookie, Page } from 'playwright-core';


let reportLocation: string = "./reports";
let chrome: ChromeLauncher.LaunchedChrome;

export interface SessionData {
    cookies: Cookie[];
    // sessionStorage : TBD
    // localStorage : TBD
}

/**
 * Input paramter data type for 'runAudit' method.
 */
export interface AuditOptions {
    chromeOptions?: ChromeFlagsConfig | {};
    sessionData?: SessionData;
    lighthouseFlags?: Flags;
}

/**
 * Chrome flags configurations.
 */
export interface ChromeFlagsConfig {
    chromeFlags?: {
        headless?: boolean;
        'disable-gpu'?: boolean;
        [key: string]: boolean | undefined; // Allow other flags as well
    };
    logLevel?: 'verbose' | 'info' | 'error' | 'warn' | 'silent';
}

/**
 * Clean up existing reports.
 */
function cleanUpReports() {
    if (fs.existsSync(reportLocation)) {
        fs.readdirSync(reportLocation).forEach(file => {
            const filePath = path.join(reportLocation, file);
            if (file.startsWith('performance-report-thread-') && file.endsWith('.html')) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.debug(`Deleted old HTML report: ${filePath}`);
                }
            }
            if (file.endsWith('.json') && file.includes('trace')) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.debug(`Deleted old Traces report: ${filePath}`);
                }
            }
            if (file.endsWith('.json') && file.includes('DevtoolsLog')) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.debug(`Deleted old Traces report: ${filePath}`);
                }
            }
            if (file.startsWith('performance-report-thread-') && file.endsWith('.json')) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.debug(`Deleted old JSON report: ${filePath}`);
                }
            }
        });
    }
}

/**
 * Prepate chrome flags and log level from ChromeFlagsConfig type object.
 */
function getChromeLaunchOptions(chromeOpt?: ChromeFlagsConfig): ChromeLauncher.Options {
    logger.debug(`Programmatic Chrome Options: ${chromeOpt}`);
    chromeOpt = chromeOpt ? chromeOpt : {};
    chromeOpt.chromeFlags = chromeOpt?.chromeFlags ? chromeOpt.chromeFlags : {};
    chromeOpt.chromeFlags.headless = chromeOpt.chromeFlags?.headless ?? (getHeadless() ?? true);
    chromeOpt.chromeFlags['disable-gpu'] = chromeOpt.chromeFlags?.['disable-gpu'] ?? (getDisableGPU() ?? true);
    logger.debug(`Updated chrome flags : ${JSON.stringify(chromeOpt.chromeFlags)}`);
    // Convert the flags from the JSON object to the array format required by chrome-launcher
    const chromeFlags: string[] = [];
    if (chromeOpt.chromeFlags) {
        for (const [key, value] of Object.entries(chromeOpt.chromeFlags)) {
            if (value === true) {
                chromeFlags.push(`--${key}`);
            }
        }
    }

    let chromeOptions: ChromeLauncher.Options = {
        chromeFlags,
        logLevel: chromeOpt.logLevel ? chromeOpt.logLevel : (getLogLevel() ? getLogLevel() : 'info'),
    }

    logger.info(`Prepared Chrome options: ${JSON.stringify(chromeOptions)}`);
    logger.debug(`Chrome user defined flags: ${chromeOptions.chromeFlags}`);
    logger.debug(`Chrome log level set to: ${chromeOptions.logLevel}`);

    return chromeOptions;
}

/**
 * Launch chrome for given url.
 * @param url url of webpage/website
 */
async function launchChrome(url?: string, chromeOptions?: ChromeFlagsConfig) {

    // launch chrome
    logger.info(`Launching chrome...`);
    //** take user input as config file value or programmatically, if absent then provide default config
    chrome = await ChromeLauncher.launch(
        getChromeLaunchOptions(chromeOptions)
    );
    logger.info(`Chrome launched on port ${chrome.port}`);
    logger.info(`Chrome default flags: ${ChromeLauncher.Launcher.defaultFlags()}`);

    return chrome;
}

/**
 * Set directory path to store the generated lighthouse report.
 * @param location absolute directory path
 */
export function setReportLocation(location: string) {
    if (location) {
        if (!validateDirectoryPath(location)) {
            throw new Error(`Invalid directory path: ${location}`);
        }
    }
    reportLocation = location;
}

/**
 * Get lighthouse flags from json properties else prepare default config.
 * @param browser 
 * @param lighthouseFlags 
 * @returns 
 */
function getLighthouseFlags(browser: ChromeLauncher.LaunchedChrome, lighthouseFlags: Flags | undefined, cookies?: Cookie[]) {
    lighthouseFlags = lighthouseFlags ? lighthouseFlags : {};
    lighthouseFlags.logLevel = lighthouseFlags.logLevel ? lighthouseFlags.logLevel : (getLogLevel() ? getLogLevel() : 'info');
    lighthouseFlags.output = lighthouseFlags.output ? lighthouseFlags.output : (getOutputTypes() ? getOutputTypes() : ['html']);
    lighthouseFlags.onlyCategories = lighthouseFlags.onlyCategories ? lighthouseFlags.onlyCategories : (getAuditCategories() ? getAuditCategories() : ['performance']);
    lighthouseFlags.formFactor = lighthouseFlags.formFactor ? lighthouseFlags.formFactor : (getFormFactor() ? getFormFactor() : "desktop");
    lighthouseFlags.port = browser.port;
    lighthouseFlags.extraHeaders = lighthouseFlags.extraHeaders ? lighthouseFlags.extraHeaders : {};
    lighthouseFlags.extraHeaders['Cookie'] = lighthouseFlags.extraHeaders['Cookie'] ? lighthouseFlags.extraHeaders['Cookie'] : (cookies ? cookies?.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') : '');
    lighthouseFlags.disableStorageReset = true;
    lighthouseFlags.clearStorageTypes = ["all"];
    lighthouseFlags.skipAboutBlank = true;
    if (lighthouseFlags.formFactor == "desktop") {
        lighthouseFlags.screenEmulation = {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
        };
        lighthouseFlags.throttlingMethod = "simulate";
        lighthouseFlags.throttling = {
            rttMs: 40,                // Round-trip time (latency) in milliseconds
            throughputKbps: 10240,     // Network download speed in Kbps (10 Mbps)
            uploadThroughputKbps: 5120, // Network upload speed in Kbps (5 Mbps)
            cpuSlowdownMultiplier: 1,  // No CPU slowdown for desktop emulation
            requestLatencyMs: 0,       // No additional request latency
            downloadThroughputKbps: 0, // No artificial download limit
        }
    }

    logger.info(`Lighthouse Config: ${JSON.stringify(lighthouseFlags)}`);
    return lighthouseFlags;
}

/**
 * Get lighthouse config based on 'formFactor' attribute from json.
 * @returns 
 */
function getLighthouseConfig(): Config {
    if (getFormFactor() == "desktop") {
        let desktopConfig: Config = {
            extends: 'lighthouse:default',
            settings: {
                formFactor: 'desktop',
                screenEmulation: {
                    mobile: false,
                    width: 1350,
                    height: 940,
                    deviceScaleFactor: 1,
                    disabled: false,
                },
                throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0,
                },
                emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4143.7 Safari/537.36 Chrome-Lighthouse',
                throttlingMethod: 'simulate'
            },
        };


        return desktopConfig;
    } else {
        return mobileConfig;
    }
}

type AuditorResult={
    median:number,
    runId:string,
    runs:number
}

/**
 *  Run lighthouse audit on the given URL and generate report. This will delete any existing reports.
 * @param url test URL
 * @param auditOpts AuditOptions
 */
export async function runAudit(url: string, auditOpts?: AuditOptions, runs?: number): Promise<AuditorResult> {

    // clean up existing reports.
    cleanUpReports();

    // generate run ID
    const runId = getRandomUUID();
    logger.info(`Run ID: ${runId}`);

    // array to store performance score of all runs
    const results: number[] = [];

    runs = runs ? runs : 1;
    for (let i = 0; i < runs; i++) {

        logger.info(`Run #${i + 1}`)

        // launch chrome
        const threadId = getRandomUUID();
        logger.info(`Running audit over thread: ${threadId}.`)
        chrome = await launchChrome(url, auditOpts?.chromeOptions);

        // set up lighthouse configuration
        let flags: Flags = getLighthouseFlags(chrome, auditOpts?.lighthouseFlags, auditOpts?.sessionData?.cookies);
        let configuration: Config = getLighthouseConfig();
        logger.info(`Lighthouse config after cookie updation: ${JSON.stringify(configuration)}`);

        try {
            logger.info(`Running lighthouse...`)
            // const runnerResult: RunnerResult | undefined = await lighthouse(url, flags, configuration);
            const runnerResult: RunnerResult | undefined = await lighthouse(url, flags);
            logger.info(`Lighthouse processing completed.`)
            // Generate reports
            generateReports(runnerResult, threadId, flags);
            if (runnerResult) {
                const perfScore = runnerResult.lhr?.categories["performance"]?.score
                if (perfScore) {
                    logger.info(`Run #${i + 1} performance score is ${perfScore}`)
                    results.push(perfScore);
                }
            }
        } catch (error) {
            logger.error(`Error in thread: ${threadId}`)
            logger.error(error);
        } finally {
            logger.info(`Killing the chrome instance.`)
            chrome.kill();
            logger.info(`Chrome instance killed successfully.`)
        }
    }

    // Calculate median perfomance socre
    const median = calculateMedian(results);
    logger.info(`Computed median performance score is ${median * 100}.`)
    return {median:median,runId:runId,runs:runs}
}

/**
 * Run lighthouse audit on the given playwright page and generate report. This will delete any existing reports.
 * @param page playwright page
 * @param runs count of total runs
 */
export async function runPlaywrightAudit(page: Page, runs?:number):Promise<AuditorResult> {
    // extract playwright page URL
    const url: string = page.url()
    logger.info(`Playwright page URL: ${url}`)
    // extract cookies and add to lighthouse flags
    let cookies: Array<Cookie> = await page.context().cookies();
    let auditOpts: AuditOptions = {}
    auditOpts.sessionData = { cookies: cookies }
    logger.info(`Playwright page cookies: ${JSON.stringify(cookies)}`)
    // run audit
    runs = runs ? runs : 5;
    logger.info(`Running lighthouse audit for playwright page for ${runs} runs.`)
    return await runAudit(url,auditOpts,runs)
}

/**
 * Generate Reports.
 * @param runnerResult 
 * @param threadId 
 * @param flags 
 */
function generateReports(runnerResult: RunnerResult | undefined, threadId: any, flags: Flags) {

    // Create 'reports' folder at root path if not present
    if (reportLocation == "./reports") {
        if (!fs.existsSync(reportLocation)) {
            fs.mkdirSync(reportLocation);
        }
    } else {
        if (!fs.existsSync(reportLocation)) {
            throw new Error(`'${reportLocation}' does not exist.`)
        }
    }

    // Generate HTML Report
    if (flags.output?.includes('html')) {
        // `.report` is the HTML report as a string or string[]
        let reportHtml = runnerResult?.report[0];
        // Ensure reportHtml is defined and handle string[] case
        if (reportHtml) {
            logger.info(`Generating HTML report.`)
            if (Array.isArray(reportHtml)) {
                reportHtml = reportHtml.join('');
            }
            // Write the report to an HTML file
            const reportFileName = `performance-report-thread-${threadId}-${Date.now()}.html`;
            const reportFilePath = path.join(
                reportLocation, reportFileName);
            fs.writeFileSync(reportFilePath, reportHtml);
            logger.info(`HTML Report generation successful.`)
        } else {
            logger.error("Report HTML is undefined. Failed to generate report.");
        }
    }

    // Generate JSON Report
    if (flags.output?.includes('json')) {
        // `.report` is the HTML report as a string or string[]
        let reportJson = runnerResult?.report[1];
        // Ensure reportJson is defined and handle string[] case
        if (reportJson) {
            logger.info(`Generating JSON report.`)
            if (Array.isArray(reportJson)) {
                reportJson = reportJson.join('');
            }
            // Write the report to an HTML file
            const reportFileName = `performance-report-thread-${threadId}-${Date.now()}.json`;
            const reportFilePath = path.join(
                reportLocation, reportFileName);
            fs.writeFileSync(reportFilePath, reportJson);
            logger.info(`JSON Report generation successful.`)
        } else {
            logger.error("Report JSON is undefined. Failed to generate report.");
        }
    }

    // Generate traces
    if (runnerResult?.artifacts) {
        logger.info(`Generating Trace JSON report.`)
        // Write the traces to json file
        const traceFileName = `${threadId}-${Date.now()}-traces.json`;
        const reportFilePath = path.join(
            reportLocation, traceFileName);
        fs.writeFileSync(reportFilePath, JSON.stringify(runnerResult.artifacts.traces.defaultPass, null, 2));
        logger.info(`Trace JSON Report generation successful.`)
    } else {
        logger.error("Failed to generate traces.");
    }

    // Generate devtools logs
    if (runnerResult?.artifacts) {
        logger.info(`Generating DevtoolsLog Records JSON report.`)
        // Write the traces to json file
        const traceFileName = `${threadId}-${Date.now()}-DevtoolsLog.json`;
        const reportFilePath = path.join(
            reportLocation, traceFileName);
        fs.writeFileSync(reportFilePath, JSON.stringify(runnerResult.artifacts['DevtoolsLog'], null, 2));
        logger.info(`DevtoolsLog JSON Report generation successful.`)
    } else {
        logger.error("Failed to generate DevtoolsLog.");
    }
}