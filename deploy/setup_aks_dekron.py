import subprocess
import json
import sys

# Configs
resource_group = 'dkron_resource_group'
location = 'swedencentral'  # 'eastus'
aks_cluster_name = 'dkron_cluster1'
node_count = 1
node_vm_size = 'Standard_D4s_v3'
disk_type = 'Managed'  # { Managed | Ephemeral }

def run_cmd(command):
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {command}\n{result.stderr}")
        return None
    return result.stdout

# Register the necessary namespaces

print('Registering Resource Providers...')

print('Registering: OperationalInsights...')
run_command('az provider register --namespace Microsoft.OperationalInsights')

print('Registering: Insights...')
run_command('az provider register --namespace Microsoft.Insights')

print('Registering: ContainerService...')
run_command('az provider register --namespace Microsoft.ContainerService')


print(f'Checking if resource group - {resource_group} - exists...')
rg_exists = json.loads(run_cmd(f'az group exists --name {resource_group}'))
if not rg_exists:
    run_cmd(f'az group create --name {resource_group} --location {location}')

print(f'Checking if AKS cluster - {aks_cluster_name} - exists...')
aks_exists = False
try:
    aks_info = run_cmd(f'az aks show --resource-group {resource_group} --name {aks_cluster_name}')
    if aks_info and 'ResourceNotFound' not in aks_info:
        aks_exists = True
except:
    print(aks_cluster_name + "not found in" + resource_group + ". Will create now...")

if not aks_exists:
    create_aks_cmd = (
        f'az aks create --resource-group {resource_group} --name {aks_cluster_name} '
        f'--node-count {node_count} --node-vm-size {node_vm_size} --node-osdisk-type {disk_type} '
        '--enable-addons monitoring --generate-ssh-keys'
    )
    run_cmd(create_aks_cmd)

print(f'Getting AKS credentials for {resource_group}:{aks_cluster_name}...')
run_cmd(f'az aks get-credentials --resource-group {resource_group} --name {aks_cluster_name} --overwrite-existing')

print('Creating Log Analytics workspace...')
run_cmd('az monitor log-analytics workspace create --resource-group {} --workspace-name MyWorkspace'.format(resource_group))

print('Getting Log Analytics workspace resource ID')
workspace_resource_id = run_cmd('az monitor log-analytics workspace show --resource-group {} --workspace-name MyWorkspace --query id -o tsv'.format(resource_group)).strip()

print('Enabling monitoring on AKS cluster')
run_cmd('az aks enable-addons --resource-group {} --name {} --addons monitoring --workspace-resource-id {}'.format(resource_group, aks_cluster_name, workspace_resource_id))

print('Adding Helm repo and updating...')
run_cmd('helm repo add dkron https://distribworks.github.io/dkron-helm/')
run_cmd('helm repo update')

#
print('Deploying Dkron through helm...')
try:
    run_cmd('helm upgrade --install dkron ./dkron-helm -f ./dkron-helm/values.yaml')
except:
    print("Helm deployment failed")
    sys.exit()

print("AKS Cluster and Dkron deployed successfully.")
# Azure Monitor for Containers enabled for historical resource monitoring. CHECK THIS