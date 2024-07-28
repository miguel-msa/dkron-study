# Dkron study for Large Scale Engineering course 2024 @IST

# Setup

To deploy Dkron into (azure) AKS follow this steps (you need an Azure subscription):

1. install az cli and login
2. Go into `/deploy/setup_aks_dekron.py`
    1. Change the Configs as desired
3. Go into `/deploy/dkron-helm/values`
    1. Change the Server and Agent replicas, cpu, ram limits
        1. Do not forget to update the extraArgs equal to the expected Server workpool size
    2. The `agent-...` templates are broken and only deploy 1 agent independent of the value set
        1. To have 0 agents put the agent templates into `/aunused_templates`, otherwise, keep it in templates
4. run `python /deploy/setup_aks_dekron.py` (mind the dir!)
5. This will start the deployment process
6. After it is deployed run:
    1. kubectl get svc
        1. This will provide the external IP of the LoadBalancer
    2. Use the externalIP to:
        1. Do requests to Dkron
        2. Access the UI -> <external-ip>:8080
7. Set the external-ip to benchmarks's variable `DKRON_LB` (inside #region setup)
    1. You can also set different payload characteristics:
        1. `DO_ON_DEMAND_JOBS`
        2. `CONCURRENT_ALLOW`
    2. To run the benchmark: `k6 run .\benchmark.js` (mind the dir!)
