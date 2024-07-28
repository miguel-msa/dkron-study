import http from "k6/http";
require("dotenv").config();

const DKRON_LB = process.env.DKRON_SERVER_ENDPOINT;

// to be used by on-demand requests
function onDemand(json) {
    json.schedule = "@manually";
    return json;
}

// to be used on jobs with retry
// function jobRetries(json, retries) {
//     json.retries = retries;
//     return json;
// }

function forbidConcurrent(json) {
    json.concurrency = "forbid";
    return json;
}

function changeEverySecondValue(json, seconds) {
    json.schedule = `@every ${seconds}s`;
    return json;
}

function makeAllRun(json) {
    json.tags = {};
    return json;
}

function createJobs() {
    // cpu heavy
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(cpuStress), {
        headers: { "Content-Type": "application/json" },
    });

    // io heavy
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(ioStress), {
        headers: { "Content-Type": "application/json" },
    });

    // memory heavy
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(memoryStress), {
        headers: { "Content-Type": "application/json" },
    });

    // long
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(longSleep), {
        headers: { "Content-Type": "application/json" },
    });

    // quick
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(quickSleep), {
        headers: { "Content-Type": "application/json" },
    });

    // stalkerTag -> a request that focuses on stressing 1 pod
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(stalkServers), {
        headers: { "Content-Type": "application/json" },
    });

    // chained (dependent)
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(chainedJobParent), {
        headers: { "Content-Type": "application/json" },
    });
    http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(chainedJobChild), {
        headers: { "Content-Type": "application/json" },
    });
}

// ----------------------
// CREATE JOBS
// ----------------------

const onDemandStress = {
    name: "quick",
    schedule: "@manually",
    timezone: "Europe/Lisbon", // /Berlin
    owner: "mmsa",
    //owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "sleep 0.1",
    },
};

const quickSleep = {
    name: "quick",
    schedule: "@every 1s",
    timezone: "Europe/Lisbon", // /Berlin
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    tags: {
        server: "true:1",
    },
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "sleep 0.25",
    },
};

const longSleep = {
    name: "long",
    schedule: "@every 1m",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "sleep 30",
    },
};

const cpuStress = {
    name: "cpuHeavy",
    schedule: "@every 10s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "sha256sum /dev/zero",
    },
};

const ioStress = {
    name: "ioHeavy",
    schedule: "@every 10s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command:
            "sh -c 'dd if=/dev/zero of=/tmp/testfile bs=1M count=1024 && rm /tmp/testfile'",
    },
};

const memoryStress = {
    name: "memoryHeavy",
    schedule: "@every 10s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "sh -c 'head -c 500M </dev/zero | tail'",
    },
};

const stalkServers = {
    name: "stalkerTag",
    schedule: "@every 10s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    tags: {
        server: "true:1",
    },
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command:
            "sh -c 'curl -o /dev/null http://speedtest.tele2.net/100MB.zip",
    },
};

// Chained Jobs (Dependent)
const chainedJobParent = {
    name: "chainedJobParent",
    schedule: "@every 10s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    executor: "shell",
    executor_config: {
        command: "echo 'parent job started'",
    },
};

const chainedJobChild = {
    name: "chainedJobChild",
    schedule: "@every 20s",
    timezone: "Europe/Lisbon",
    owner: "mmsa",
    owner_email: "miguel.albuquerque@tecnico.ulisboa.pt",
    disabled: false,
    retries: 0,
    concurrency: "allow",
    dependent_jobs: ["chainedJobParent"],
    executor: "shell",
    executor_config: {
        command: "echo 'child job started after parent job'",
    },
};

// ----------------------
// TRIGGER (on demand) JOBS
// ----------------------
function demandOnDemandStress() {
    return http.post(`${DKRON_LB}/v1/jobs`, JSON.stringify(onDemandStress), {
        headers: { "Content-Type": "application/json" },
    });
}

// ! PROBABLY NOT USING THIS
function demandQuickSleep() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(quickSleep)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

function demandLongSleep() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(longSleep)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

function demandCpuStress() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(cpuStress)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

function demandIoStress() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(ioStress)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

function demandMemoryStress() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(memoryStress)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

function demandMemoryStress() {
    return http.post(
        `${DKRON_LB}/v1/jobs`,
        JSON.stringify(onDemand(memoryStress)),
        {
            headers: { "Content-Type": "application/json" },
        }
    );
}

// Export the createJobs function
export {
    demandOnDemandStress,
    createJobs,
    forbidConcurrent,
    jobRetries,
    onDemand,
};
