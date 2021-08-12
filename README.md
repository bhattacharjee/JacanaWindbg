# JacanaWindbg
Scripts for Windbg

## PoolHitTagHelper
Windbg will automatically break into allocations and deallocations of a specific tag if nt!poolHitTag is set to the tag. However, this requires human interaction after each break. This script helps with this automation, and will automatically extract the required information and continue execution till the next hit.
Once all information is collected, it can be parsed by a script.
Please read the comment on the top of the script for usage instructions.


