import http from "k6/http";
import { sleep } from "k6";

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

function forbidConcurrent(json) {
    json.concurrency = "forbid";
    return json;
}

let secvalue = 20;

// const createdJobNames = new Map();
async function addScheduledJobs(allowConcurrent, jobName) {
    console.log("created::: ", jobName);
    quickJob.name = jobName;

    // duplicate job's frequency
    quickJob.schedule = `@every ${secvalue}s`;

    secvalue = Math.floor(secvalue / 2);

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

// #endregion
// --------------------------------------------------
// ----------------- SETUP END ----------------------
// --------------------------------------------------

const DKRON_LB = "http://135.225.10.231:8080"; // ! CHANGE THIS

export const options = {
    stages: [
        { duration: "60s", target: 20 },
        { duration: "60s", target: 60 },
        { duration: "60s", target: 0 },
    ],
};

const DO_ON_DEMAND_JOBS = true; // ! CHANGE THIS
const CONCURRENT_ALLOW = true; // ! CHANGE THIS

let ON_DEMAND_EVALUATED = false;

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
