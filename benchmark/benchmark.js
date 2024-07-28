import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";

// Metrics
// const reqDurationTrend = new Trend("request_duration_trend");
// const requestCounter = new Counter("request_duration_trend");
// const errorRate = new Rate("http_req_failed");

// --------------------------------------------------
// --------------------------------------------------
// ----------------- SETUP --------------------------
// --------------------------------------------------
// --------------------------------------------------
// #region setup
let STAGE_COUNTER = 0;

const stagesAlreadySent = new Map();

// does the same job, but with double frequency
function duplicateAndCutJob(json) {
    // increment name
    json.name = json.name.replace(/\d+$/, () => STAGE_COUNTER);

    // cut repeat time wait in half
    const regex = /@every (\d+)s/;
    const match = json.schedule.match(regex);

    if (match) {
        const originalNum = parseInt(match[1], 10);
        const newNum = Math.floor(originalNum / 2);

        json.schedule = json.schedule.replace(regex, `@every ${newNum}s`);
    } else {
        console.log(`could not cut in half: ${json.schedule}`);
    }

    return json;
}

function forbidConcurrent(json) {
    json.concurrency = "forbid";
    return json;
}

let secvalue = 20;

// const createdJobNames = new Map();
async function addScheduledJobs(allowConcurrent, jobName) {
    // duplicate job
    // const jobName = "quick" + STAGE_COUNTER + VU;
    // createdJobNames.set(jobName, "");
    console.log("created::: ", jobName);
    quickJob.name = jobName;

    // duplicate job's frequency
    quickJob.schedule = `@every ${secvalue}s`;

    secvalue = Math.floor(secvalue / 2);

    // avoids UVs trying to create a job that already was created
    //if (!stagesAlreadySent.has(STAGE_COUNTER)) {
    //   stagesAlreadySent.set(STAGE_COUNTER);

    if (!allowConcurrent) {
        //quick sleep
        http.post(
            `${DKRON_LB}/v1/jobs`,
            JSON.stringify(forbidConcurrent(quickJob)),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    } else {
        http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(quickJob), {
            headers: { "Content-Type": "application/json" },
        });
    }

    STAGE_COUNTER++;
    // jobs.forEach((job, idx) => {
    //     jobs[idx] = duplicateAndCutJob(job);
    //     console.log(jobs[idx]);
    // });
    // }
}

// ----------------------
// CREATE JOBS
// ----------------------

const onDemandStress = {
    name: "ondemandstress",
    schedule: "@manually",
    timezone: "Europe/Lisbon",
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "echo manually",
    },
};

const quickJob = {
    name: "quick0",
    schedule: "@every 20s",
    timezone: "Europe/Lisbon",
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "echo quickJob",
    },
};

// ----------------------
// TRIGGER (on demand) JOBS
// ----------------------
function createOnDemandStress(allowConcurrent) {
    if (!allowConcurrent) {
        return http.post(
            `${DKRON_LB}/v1/jobs`,
            JSON.stringify(forbidConcurrent(onDemandStress)),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    } else {
        return http.post(
            `${DKRON_LB}/v1/jobs`,
            JSON.stringify(onDemandStress),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

//const jobs = [quickJob /* , cpuStress, ioStress, memoryStress */];

// #endregion
// --------------------------------------------------
// ----------------- SETUP END ----------------------
// --------------------------------------------------

const DKRON_LB = "http://:8080"; // ! CHANGE THIS

export const options = {
    stages: [
        { duration: "60s", target: 20 },
        { duration: "60s", target: 60 },
        { duration: "60s", target: 0 },
    ],
};

const DO_ON_DEMAND_JOBS = true; // ! CHANGE THIS
const CONCURRENT_ALLOW = false; // ! CHANGE THIS

let ON_DEMAND_EVALUATED = false;

// const createdJobNames = new Map();
// const createdJobNames = new SharedArray("createdJobNames", () => []);
export default function () {
    if (!ON_DEMAND_EVALUATED) {
        if (DO_ON_DEMAND_JOBS) {
            createOnDemandStress(CONCURRENT_ALLOW);
        }
        ON_DEMAND_EVALUATED = true;
    }

    if (DO_ON_DEMAND_JOBS) {
        http.del(`${DKRON_LB}/v1/jobs/ondemandstress`, {
            headers: { "Content-Type": "application/json" },
        });
    }

    const jobName = "quick" + STAGE_COUNTER + __VU;

    addScheduledJobs(CONCURRENT_ALLOW, jobName);

    sleep(30);
}

// console.log("All scheduled jobs deleted");

// export function teardown() {
//     console.log(`Deleting ${createdJobNames.length} jobs...`);
//     for (const jobName of createdJobNames) {
//         const res = http.del(`${DKRON_LB}/v1/jobs/${jobName}`, {
//             headers: { "Content-Type": "application/json" },
//         });
//         console.log(`Deleting ${jobName}...: ${res.status}`);
//     }

//     // for (const [k, v] of createdJobNames.entries()) {
//     //     const res = http.del(`${DKRON_LB}/v1/jobs/${k}`, {
//     //         headers: { "Content-Type": "application/json" },
//     //     });
//     //     console.log(`Deleting ${k}...: ${res.status}`);
//     // }

//     console.log("All scheduled jobs deleted");
// }
