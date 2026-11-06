# C academic implementation

This standalone program is the Logic Building using C submission. It deliberately uses:

- arrays of `Product` and `CartItem` structures;
- CSV file reading and rewriting;
- linear search by SKU, barcode, or name;
- stock validation and deduction;
- bill calculation and receipt file generation;
- an append-only sales file and daily report.

Compile with warnings enabled:

```powershell
gcc -std=c11 -Wall -Wextra -Wpedantic -O2 main.c -o grocery_billing.exe
```

Run the executable from this directory so it can find `products.csv`. Generated `sales.csv` and receipt text files are ignored by source control.

