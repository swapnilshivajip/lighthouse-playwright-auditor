# lighthouse-playwright-auditor

Lighthouse is an open-source, automated tool by Google for improving the quality of web pages. You can run it against any web page, public or requiring authentication. It has audits for performance, accessibility, progressive web apps, SEO, and more.\
lighthouse-playwright-auditor enables you to use lighthouse audits inside your playwright scripts.

## Compatibility

This package is tested for following versions:

| version       | dependency    | 
| -----------   | -----------   |
|^1.31          |playwright     |
|^12.2.0        |lighthouse     |

## How to guide:

#### 1. Installation
- Navigate to your playwright framework/project.
- Add the following dependencies:
    - lighthouse-playwright-auditor
    - playwright [if not installed]
    - lighthouse

- Option A: `npm install lighthouse-playwright-auditor playwright lighthouse`

- Option B: by adding dependenceis to package .json and executing `npm install`

#### 2. Configuration
- Add `lighthouse-config.json` file to the project root as:
    ```json
        {
            "formFactor": "desktop",
            "output":["html","json"],
            "auditCategories":["performance"],
            "logLevel": "info",
            "headless":false,
            "disableGPU":false
        }
    ```
    `lighthouse-config.json` explained:
    - formFactor: allowed values are "mobile" or "desktop". Results are calculated and calibrated based on form factor. [string]
    - output: allowed values are "html", "json", "csv". It controls output report format. [array]
    - auditCategories: allowed values are "performance", "accessibility", "best-practices", "seo" [array]
    - logLevel: allowed values are "silent", "error", "warn", "info", "verbose" [string]
    - headless: allowed values are true or false. It controls whether browser runs in headless mode [boolean]
    - disableGPU: allowed values are true or false. It controls whether browser uses GPU [boolean]

#### 3. Execution
Code Sample:

```typescript
        import { test, expect } from '@playwright/test';

        test.describe('Demo Test Suite', async () => {
            test('playwright light house audit demo test', async ({ page }) => {

                // navigate to page, login if required for authenticated page
                await page.goto('https://playwright.dev/');

                // dynamically importing 'lighthouse-playwright-auditor'
                let lighthouseAuditor = await import('lighthouse-playwright-auditor');

                /* 
                perform any other operation if you want to 
                such as click link to navigate to other page, 
                once you arrive at your target page, run lighthouse audit
                */
                let result = await lighthouseAuditor.runPlaywrightAudit(page);
                console.log(`Median score: ${result.median}`);
                // Assert the performance score
                expect(result.median*100).toBeGreaterThan(90);

            });
        }) 
```

Note:
- To tackle the variance in result, it is recommended to run the audit atleast 5 times and consider median score of all 5 runs. This package handles it by default when you run the audit as is : 

    `await lighthouseAuditor.runPlaywrightAudit(page);`

- If you want to override the count of runs, you can pass the count as below:
    
    `await lighthouseAuditor.runPlaywrightAudit(page, 10);`
    
    this will run audit 10 times in sequential manner. Running the audit in parallel on same host is not supported as it affect resources while computing the score.

- For authenticated pages, it will extract session cookies from playwright page object and inject them while navigating to same page via lighthouse. Session storage and local storage injection is yet to be supported. 

#### 4. Reporting 
![Sample HTML Report](/reports/samplereport.png)

It will generate reports as specified in lighthouse-config.json in report folder at project root. Apart from primary performance report, it generates two more reports of devtools log and traces in json format. If no output value is provided, then it generates html report by default.
**Old reports are automatically cleaned up on every fresh run.**

```
-project-root
    - lighthouse-config.json
    - reports
        - 2f15bd21-c498-4c05-9c44-05eac3adcf8a-1728628137781-traces.json
        - 2f15bd21-c498-4c05-9c44-05eac3adcf8a-1728628137851-DevtoolsLog.json
        - performance-report-thread-2f15bd21-c498-4c05-9c44-05eac3adcf8a-1728628137750.html
        - performance-report-thread-2f15bd21-c498-4c05-9c44-05eac3adcf8a-1728628137765.json
```

#### 5. Miscellaneous

1. If you want more control over chrome flags, session data and lighthouse flags, then you can consider using `runAudit(url: string, auditOpts?: AuditOptions, runs?: number)` method. Instead of passing playwright page object, pass the extracted URL and cookies from page object to this method.

    `await lighthouseAuditor.runAudit(page.url,{sessionData:{cookies:page.context().cookies()}},2);`

2. #### System requirements to tackle variance in the result (Copied from [here](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md#strategies-for-dealing-with-variance)):
    - Minimum 2 dedicated cores (4 recommended)
    - Minimum 2GB RAM (4-8GB recommended)
    - Avoid non-standard Chromium flags (--single-process is not supported, --no-sandbox and --headless should be OK, though educate yourself about sandbox tradeoffs)
    - Avoid function-as-a-service infrastructure (Lambda, GCF, etc)
    - Avoid "burstable" or "shared-core" instance types (AWS t instances, GCP shared-core N1 and E2 instances, etc)

    AWS's m5.large, GCP's n2-standard-2, and Azure's D2 all should be sufficient to run a single Lighthouse run at a time.
    DO NOT collect multiple Lighthouse reports at the same time on the same machine. 

## References:

https://www.npmjs.com/package/chrome-launcher

https://www.npmjs.com/package/lighthouse?activeTab=readme

https://github.com/GoogleChrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically

https://akanksha98.medium.com/lighthouse-integration-with-docker-b8d9fddedce6

https://github.com/akagupta9/lighthouse-wrapper

https://medium.com/testvagrant/automate-lighthouse-2822b12f3465

https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md

https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md

https://www.debugbear.com/blog/network-throttling-methods

https://www.debugbear.com/blog/simulated-throttling

https://www.debugbear.com/blog/render-blocking-resources

https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md

https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html

https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html

https://snyk.io/blog/best-practices-create-modern-npm-package/

https://dev.to/martinpersson/create-and-publish-your-first-npm-package-a-comprehensive-guide-3l0a
