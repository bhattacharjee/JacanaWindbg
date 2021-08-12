//    Windbg Helper for nt!PoolHitTag simplification
//    Copyright (C) 2021, Rajbir Bhattacharjee
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.

//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <https://www.gnu.org/licenses/>.


// SETUP
// You will need the "Code Machine Debugger Extension dll", and put it in the
// appropriate windbg directory. The dll is available from:
// https://www.codemachine.com/downloads.html
//
// Please make sure that you can run the following commands to test the
// installation of the Code Machine Debugger Extension:
//
// .load cmkd
// !stack -p
//
// Instructions to run the script:
// Modify the following variables as required:
//   tag
//   count
//   logfile
//
// In windbg, reload the symbols first (all drivers)
//
// Once symbols are reloaded, execute the following:
//
//   .scriptload c:\path\to\poolHitTagHelper.js
//   dx  Debugger.State.Scripts.poolHitTagHelper.Contents.poolHitTagHelper()
//
// If you have modified the script, you need to unload and then load
// the script again. To unload the script, use the following:
//
//   .scriptunload poolHitTagHelper.js
//
// It is recommended to make a run with a smaller count first to see
// if the log file is being created properly with the output or not.
//
// Once the logfile is created, it can be parsed using a python script
// that collates all the stacks and compares the allocations and deallocations

function reverseString(str)
{
    var newString = "";

    for (var i = str.length - 1; i >= 0; i--)
    {
        newString += str[i];
    }

    return newString;
}

function isAllocation()
{
    var ctl = host.namespace.Debugger.Utility.Control;
    var st = ctl.ExecuteCommand("k 2");
    var frameNum = -1;
    for (var frame of st)
    {
        frameNum++;
        if (frame.indexOf("ExAllocateHeapPool") !== -1)
        {
            return true;
        }
        if (frame.indexOf("ExAllocatePoolWithTag") !== -1)
        {
            return true;
        }
        if (frameNum > 3)
        {
            return false;
        }
    }
    return false;
}

function isDeallocation()
{
    var ctl = host.namespace.Debugger.Utility.Control;
    var st = ctl.ExecuteCommand("k 2");
    var frameNum = -1;
    for (var frame of st)
    {
        frameNum++;
        if (frame.indexOf("ExFreeHeapPool") !== -1)
        {
            return true;
        }
        if (frame.indexOf("ExFreePool") !== -1)
        {
            return true;
        }
        if (frameNum > 3)
        {
            return false;
        }
    }
    return false;
}

function printAdditionalAllocationInformation()
{
    var diag = host.diagnostics;
    var ctl = host.namespace.Debugger.Utility.Control;
    while (isAllocation() === true)
    {
        ctl.ExecuteCommand("gu");
    }
    var op = ctl.ExecuteCommand("r rax");
    for (var line of op)
    {
        diag.debugLog("-> ", line, "\n");
    }
}

function printProcessName()
{
    var diag = host.diagnostics;
    var ctl = host.namespace.Debugger.Utility.Control;
    var output = ctl.ExecuteCommand("!process -1 0");
    for (var line of output)
    {
        if (line.indexOf("Image:") !== -1)
        {
            diag.debugLog("-> ", line, "\n");
        }
        if (line.startsWith("PROCESS"))
        {
            diag.debugLog("-> ", line, "\n");
        }
    }

}

function printAdditionalDeallocationInformation()
{
    var diag = host.diagnostics;
    var ctl = host.namespace.Debugger.Utility.Control;
    var interesting = false;

    output = ctl.ExecuteCommand("!stack -p");

    for (var line of output)
    {
        if (line.startsWith('02'))
        {
            break;
        }

        if (line.startsWith('0'))
        {
            if (line.indexOf("ExFree") !== -1)
            {
                interesting = true;
                diag.debugLog(line, "\n");
            }
            else
            {
                interesting = false;
            }
        }

        if (true === interesting)
        {
            if (line.indexOf("Parameter[0]") !== -1)
            {
                diag.debugLog(line, "\n");
            }
        }
    }
}

function poolHitTagHelper()
{
    // TODO: Modify the ta and the count
    var tag = "Toke";   
    var count = 40;
    var logfile = "c:\\support\\logfile.log";

    var ctl = host.namespace.Debugger.Utility.Control;
    var diag = host.diagnostics;

    var rtag = reverseString(tag);
    var command = "ed nt!PoolHitTag '" + rtag + "'";

    ctl.ExecuteCommand(".load cmkd")
    ctl.ExecuteCommand(".logclose");
    ctl.ExecuteCommand(".logopen " + logfile);


    var output = ctl.ExecuteCommand(command);
    for (var line of output)
    {
        host.diagnostics.debugLog(output, "\n");
    }
    

    diag.debugLog("**************************************\n\n");
    diag.debugLog("---------------------------------\n");
    diag.debugLog("g");

    for (let i = 0; i < count; i++)
    {
        if (isDeallocation() === true)
        {
            diag.debugLog("\n>>");
            diag.debugLog("free\n");
            printAdditionalDeallocationInformation();
            diag.debugLog("<<\n");
        }
        else
        {
            // isAllocation will change the stack, so we need
            // to save it first
            var output = ctl.ExecuteCommand("kn");

            if (isAllocation() === true)
            {
                diag.debugLog("\n>>");
                diag.debugLog("malloc\n");
                printProcessName();
                printAdditionalAllocationInformation();

                diag.debugLog("{{\n");
                for (var line of output)
                {
                    diag.debugLog(" ", line, "\n");
                }
                diag.debugLog("}}\n");

                diag.debugLog("<<\n");
            }
        }

        ctl.ExecuteCommand("g");
    }
    diag.debugLog("======================================\n\n");

    ctl.ExecuteCommand(".logclose")
}

