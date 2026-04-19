# Cache-ctrl local dev support
- We should do the same thing we did for la_briguade local dev but for cache-ctrl skills and binaries.
=> inside container there is a symlink for SKILLs
```sh 
opencode@1626e91737da:~/.config/opencode/skills/cache-ctrl-caller$ ls -l
total 4
lrwxrwxrwx 1 opencode node 65 Apr 17 15:34 SKILL.md -> /home/fefou/dev-conf/cache-ctrl/skills/cache-ctrl-caller/SKILL.md
```
=> binaries are the installed one from the Dockerfile but in local development we should have the one from cache-ctrl (symlink to ~/.local/bin/cache-ctrl).

