# Check Git Remote Synchronization

To check whether the local `main` branch is synchronized with both remote repositories (`gitv` and `origin`), follow these steps.

### 1. Start the SSH Tunnel

Before accessing `gitv` (GitLab VPS), open a separate Git Bash terminal and run:

```bash
ssh -i ~/.ssh/id_rsa -N -L 43211:127.0.0.1:43211 cisvix@[ID_ADDRESS]
```

Keep this terminal open while working with `gitv`.

**Note:** The SSH tunnel is only required for `gitv`. The `origin` remote (GitLab.com) does not require this tunnel.

### 2. Fetch the Latest Remote Information

```bash
git fetch gitv
git fetch origin
```

### 3. Compare Local and Remote Branches

```bash
# Check GitLab VPS
git rev-list --left-right --count main...gitv/main

# Check GitLab.com
git rev-list --left-right --count main...origin/main
```

### 4. Understand the Results

| Output | Meaning |
|---|---|
| `0 0` | Local and remote are synchronized |
| `1 0` | 1 local commit has not been pushed |
| `0 2` | Remote has 2 commits not present locally |
| `2 1` | Both branches have unique commits |

### 5. Check Both Remotes at Once

```bash
git fetch gitv
git fetch origin

echo "===== GITV ====="
git rev-list --left-right --count main...gitv/main

echo "===== ORIGIN ====="
git rev-list --left-right --count main...origin/main
```

**Note:** The local `main` branch tracks only one upstream branch at a time. Tracking `gitv/main` does not automatically synchronize `origin/main`.

Both results should be `0 0` when the local branch is synchronized with both remotes.