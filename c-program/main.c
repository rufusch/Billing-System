/*
 * GreenBasket Grocery Billing System
 * Academic C implementation: arrays, structures, searching and file handling.
 */

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define PRODUCTS_FILE "products.csv"
#define SALES_FILE "sales.csv"
#define MAX_PRODUCTS 500
#define MAX_CART_ITEMS 100
#define TEXT_LEN 80
#define LINE_LEN 512

typedef struct {
    char sku[24];
    char name[TEXT_LEN];
    char unit[12];
    double price;
    double gst_percent;
    double stock;
    double min_stock;
} Product;

typedef struct {
    int product_index;
    double quantity;
} CartItem;

typedef struct {
    CartItem items[MAX_CART_ITEMS];
    int count;
    double subtotal;
    double gst;
    double discount;
    double total;
} Cart;

static void trim_newline(char *text) {
    text[strcspn(text, "\r\n")] = '\0';
}

static int read_line(const char *prompt, char *output, size_t size) {
    printf("%s", prompt);
    fflush(stdout);
    if (fgets(output, (int)size, stdin) == NULL) return 0;
    trim_newline(output);
    return 1;
}

static int read_int(const char *prompt, int *value) {
    char buffer[64], extra;
    if (!read_line(prompt, buffer, sizeof(buffer))) return 0;
    return sscanf(buffer, "%d %c", value, &extra) == 1;
}

static int read_double(const char *prompt, double *value) {
    char buffer[64], extra;
    if (!read_line(prompt, buffer, sizeof(buffer))) return 0;
    return sscanf(buffer, "%lf %c", value, &extra) == 1;
}

static int equals_ignore_case(const char *left, const char *right) {
    while (*left && *right) {
        if (tolower((unsigned char)*left) != tolower((unsigned char)*right)) return 0;
        left++;
        right++;
    }
    return *left == '\0' && *right == '\0';
}

static int contains_ignore_case(const char *text, const char *query) {
    size_t query_length = strlen(query);
    if (query_length == 0) return 1;
    for (; *text; text++) {
        size_t index = 0;
        while (index < query_length && text[index] &&
               tolower((unsigned char)text[index]) == tolower((unsigned char)query[index])) {
            index++;
        }
        if (index == query_length) return 1;
    }
    return 0;
}

static int parse_product(char *line, Product *product) {
    char *fields[7];
    int count = 0;
    char *token = strtok(line, ",");
    while (token != NULL && count < 7) {
        fields[count++] = token;
        token = strtok(NULL, ",");
    }
    if (count != 7) return 0;
    snprintf(product->sku, sizeof(product->sku), "%s", fields[0]);
    snprintf(product->name, sizeof(product->name), "%s", fields[1]);
    snprintf(product->unit, sizeof(product->unit), "%s", fields[2]);
    product->price = strtod(fields[3], NULL);
    product->gst_percent = strtod(fields[4], NULL);
    product->stock = strtod(fields[5], NULL);
    product->min_stock = strtod(fields[6], NULL);
    return product->sku[0] != '\0' && product->name[0] != '\0' && product->price >= 0 && product->stock >= 0;
}

static int load_products(Product products[], int *count) {
    FILE *file = fopen(PRODUCTS_FILE, "r");
    char line[LINE_LEN];
    *count = 0;
    if (file == NULL) {
        fprintf(stderr, "Cannot open %s: %s\n", PRODUCTS_FILE, strerror(errno));
        return 0;
    }
    if (fgets(line, sizeof(line), file) == NULL) {
        fclose(file);
        return 0;
    }
    while (*count < MAX_PRODUCTS && fgets(line, sizeof(line), file) != NULL) {
        trim_newline(line);
        if (line[0] != '\0' && parse_product(line, &products[*count])) (*count)++;
    }
    fclose(file);
    return 1;
}

static int save_products(const Product products[], int count) {
    char temporary[64];
    snprintf(temporary, sizeof(temporary), "%s.tmp", PRODUCTS_FILE);
    FILE *file = fopen(temporary, "w");
    int index;
    if (file == NULL) return 0;
    fprintf(file, "sku,name,unit,price,gst_percent,stock,min_stock\n");
    for (index = 0; index < count; index++) {
        const Product *product = &products[index];
        fprintf(file, "%s,%s,%s,%.2f,%.2f,%.3f,%.3f\n", product->sku, product->name,
                product->unit, product->price, product->gst_percent, product->stock, product->min_stock);
    }
    if (fclose(file) != 0) return 0;
    remove(PRODUCTS_FILE);
    return rename(temporary, PRODUCTS_FILE) == 0;
}

static int find_product(const Product products[], int count, const char *query) {
    int index;
    for (index = 0; index < count; index++) {
        if (equals_ignore_case(products[index].sku, query)) return index;
    }
    return -1;
}

static void list_products(const Product products[], int count, const char *query) {
    int index, matches = 0;
    printf("\n%-4s %-14s %-28s %8s %11s %s\n", "No.", "SKU", "Product", "Price", "Stock", "Unit");
    printf("----------------------------------------------------------------------------\n");
    for (index = 0; index < count; index++) {
        const Product *product = &products[index];
        if (query[0] && !contains_ignore_case(product->name, query) && !contains_ignore_case(product->sku, query)) continue;
        printf("%-4d %-14s %-28.28s %8.2f %11.3f %s%s\n", index + 1, product->sku,
               product->name, product->price, product->stock, product->unit,
               product->stock <= product->min_stock ? "  LOW" : "");
        matches++;
    }
    if (!matches) printf("No matching products.\n");
}

static double included_gst(double line_total, double gst_percent) {
    if (gst_percent <= 0) return 0;
    return line_total - (line_total * 100.0 / (100.0 + gst_percent));
}

static void calculate_cart(Cart *cart, const Product products[]) {
    int index;
    cart->subtotal = 0;
    cart->gst = 0;
    for (index = 0; index < cart->count; index++) {
        const Product *product = &products[cart->items[index].product_index];
        double line_total = product->price * cart->items[index].quantity;
        cart->subtotal += line_total;
        cart->gst += included_gst(line_total, product->gst_percent);
    }
    cart->total = cart->subtotal - cart->discount;
}

static void show_cart(const Cart *cart, const Product products[]) {
    int index;
    printf("\n%-3s %-26s %9s %10s\n", "No", "Item", "Qty", "Amount");
    printf("-------------------------------------------------------\n");
    for (index = 0; index < cart->count; index++) {
        const CartItem *item = &cart->items[index];
        const Product *product = &products[item->product_index];
        printf("%-3d %-26.26s %9.3f %10.2f\n", index + 1, product->name,
               item->quantity, product->price * item->quantity);
    }
    printf("-------------------------------------------------------\n");
    printf("Subtotal: %10.2f   GST included: %8.2f\n", cart->subtotal, cart->gst);
    printf("Discount: %10.2f   Total:        %8.2f\n", cart->discount, cart->total);
}

static void make_bill_number(char output[], size_t size, const struct tm *local) {
    char date_part[20];
    strftime(date_part, sizeof(date_part), "%Y%m%d-%H%M%S", local);
    snprintf(output, size, "GB-%s", date_part);
}

static int write_sale_and_receipt(const Cart *cart, const Product products[], const char *payment,
                                  const char *customer, char bill_number[], size_t bill_size) {
    time_t now = time(NULL);
    struct tm *local = localtime(&now);
    char date[16], timestamp[32], receipt_name[80];
    FILE *sales, *receipt;
    int index;
    if (local == NULL) return 0;
    make_bill_number(bill_number, bill_size, local);
    strftime(date, sizeof(date), "%Y-%m-%d", local);
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local);
    sales = fopen(SALES_FILE, "a+");
    if (sales == NULL) return 0;
    fseek(sales, 0, SEEK_END);
    if (ftell(sales) == 0) fprintf(sales, "date,bill_number,sku,name,quantity,line_total,payment\n");
    for (index = 0; index < cart->count; index++) {
        const CartItem *item = &cart->items[index];
        const Product *product = &products[item->product_index];
        fprintf(sales, "%s,%s,%s,%s,%.3f,%.2f,%s\n", date, bill_number, product->sku,
                product->name, item->quantity, product->price * item->quantity, payment);
    }
    fclose(sales);
    snprintf(receipt_name, sizeof(receipt_name), "receipt_%s.txt", bill_number);
    receipt = fopen(receipt_name, "w");
    if (receipt == NULL) return 0;
    fprintf(receipt, "          GREENBASKET GROCERY\n");
    fprintf(receipt, "               TAX INVOICE\n");
    fprintf(receipt, "------------------------------------------\n");
    fprintf(receipt, "Bill: %s\nDate: %s\n", bill_number, timestamp);
    fprintf(receipt, "Customer: %s\n", customer[0] ? customer : "Walk-in");
    fprintf(receipt, "------------------------------------------\n");
    for (index = 0; index < cart->count; index++) {
        const CartItem *item = &cart->items[index];
        const Product *product = &products[item->product_index];
        fprintf(receipt, "%-25.25s %9.2f\n", product->name, product->price * item->quantity);
        fprintf(receipt, "  %.3f %s x %.2f\n", item->quantity, product->unit, product->price);
    }
    fprintf(receipt, "------------------------------------------\n");
    fprintf(receipt, "Subtotal                 %14.2f\n", cart->subtotal);
    fprintf(receipt, "Included GST             %14.2f\n", cart->gst);
    fprintf(receipt, "Discount                 %14.2f\n", cart->discount);
    fprintf(receipt, "TOTAL                    %14.2f\n", cart->total);
    fprintf(receipt, "Payment: %s\n", payment);
    fprintf(receipt, "------------------------------------------\nThank you for shopping with us.\n");
    fclose(receipt);
    printf("Receipt saved to %s\n", receipt_name);
    return 1;
}

static void create_bill(Product products[], int count) {
    Cart cart = {0};
    char input[TEXT_LEN], payment[16], customer[TEXT_LEN], bill_number[40];
    int product_index, cart_index;
    double quantity;
    printf("\nNEW BILL — enter a SKU, or DONE to finish\n");
    while (cart.count < MAX_CART_ITEMS) {
        if (!read_line("SKU: ", input, sizeof(input))) return;
        if (equals_ignore_case(input, "DONE")) break;
        product_index = find_product(products, count, input);
        if (product_index < 0) { printf("Product not found.\n"); continue; }
        printf("%s — available %.3f %s at Rs. %.2f\n", products[product_index].name,
               products[product_index].stock, products[product_index].unit, products[product_index].price);
        if (!read_double("Quantity: ", &quantity) || quantity <= 0) { printf("Enter a positive quantity.\n"); continue; }
        if (quantity > products[product_index].stock) { printf("Insufficient stock.\n"); continue; }
        for (cart_index = 0; cart_index < cart.count; cart_index++) {
            if (cart.items[cart_index].product_index == product_index) break;
        }
        if (cart_index == cart.count) {
            cart.items[cart.count].product_index = product_index;
            cart.items[cart.count].quantity = 0;
            cart.count++;
        }
        if (cart.items[cart_index].quantity + quantity > products[product_index].stock) {
            printf("Combined quantity exceeds stock.\n");
            continue;
        }
        cart.items[cart_index].quantity += quantity;
        calculate_cart(&cart, products);
        show_cart(&cart, products);
    }
    if (cart.count == 0) { printf("Bill cancelled: no items.\n"); return; }
    if (!read_double("Discount amount [0]: ", &cart.discount)) cart.discount = 0;
    if (cart.discount < 0 || cart.discount > cart.subtotal) { printf("Invalid discount; using zero.\n"); cart.discount = 0; }
    calculate_cart(&cart, products);
    show_cart(&cart, products);
    if (!read_line("Customer name (optional): ", customer, sizeof(customer))) return;
    if (!read_line("Payment (cash/upi/card): ", payment, sizeof(payment))) return;
    if (!equals_ignore_case(payment, "cash") && !equals_ignore_case(payment, "upi") && !equals_ignore_case(payment, "card")) {
        printf("Invalid payment method.\n"); return;
    }
    if (!read_line("Type YES to complete the sale: ", input, sizeof(input)) || !equals_ignore_case(input, "YES")) {
        printf("Bill cancelled.\n"); return;
    }
    for (cart_index = 0; cart_index < cart.count; cart_index++) {
        products[cart.items[cart_index].product_index].stock -= cart.items[cart_index].quantity;
    }
    if (!save_products(products, count) || !write_sale_and_receipt(&cart, products, payment, customer, bill_number, sizeof(bill_number))) {
        fprintf(stderr, "Could not save the complete sale. Check file permissions.\n");
        return;
    }
    printf("Sale completed: %s, total Rs. %.2f\n", bill_number, cart.total);
}

static void receive_stock(Product products[], int count) {
    char sku[24], reference[TEXT_LEN];
    double quantity;
    int index;
    if (!read_line("Product SKU: ", sku, sizeof(sku))) return;
    index = find_product(products, count, sku);
    if (index < 0) { printf("Product not found.\n"); return; }
    printf("%s currently has %.3f %s.\n", products[index].name, products[index].stock, products[index].unit);
    if (!read_double("Quantity received: ", &quantity) || quantity <= 0) { printf("Invalid quantity.\n"); return; }
    read_line("Supplier/reference (optional): ", reference, sizeof(reference));
    products[index].stock += quantity;
    if (save_products(products, count)) printf("Stock updated to %.3f %s. Reference: %s\n", products[index].stock, products[index].unit, reference);
    else fprintf(stderr, "Stock could not be saved.\n");
}

static void daily_report(void) {
    FILE *file = fopen(SALES_FILE, "r");
    char requested[16], date_input[16], line[LINE_LEN], copy[LINE_LEN], *field;
    int bills = 0;
    double total = 0;
    char last_bill[40] = "";
    time_t now = time(NULL);
    struct tm *local = localtime(&now);
    if (local == NULL) return;
    strftime(requested, sizeof(requested), "%Y-%m-%d", local);
    printf("Report date [%s]: ", requested);
    fflush(stdout);
    if (fgets(date_input, sizeof(date_input), stdin) != NULL) {
        trim_newline(date_input);
        if (strlen(date_input) == 10) memcpy(requested, date_input, sizeof(requested));
    }
    if (file == NULL) { printf("No sales have been recorded.\n"); return; }
    fgets(line, sizeof(line), file);
    while (fgets(line, sizeof(line), file) != NULL) {
        char *bill, *amount;
        snprintf(copy, sizeof(copy), "%s", line);
        field = strtok(copy, ",");
        if (field == NULL || strcmp(field, requested) != 0) continue;
        bill = strtok(NULL, ",");
        strtok(NULL, ","); strtok(NULL, ","); strtok(NULL, ",");
        amount = strtok(NULL, ",");
        if (bill && strcmp(last_bill, bill) != 0) { bills++; snprintf(last_bill, sizeof(last_bill), "%s", bill); }
        if (amount) total += strtod(amount, NULL);
    }
    fclose(file);
    printf("\nDAILY REPORT — %s\nBills issued: %d\nGross sales: Rs. %.2f\n", requested, bills, total);
}

int main(void) {
    Product products[MAX_PRODUCTS];
    int product_count = 0, choice;
    char query[TEXT_LEN];
    if (!load_products(products, &product_count)) return EXIT_FAILURE;
    printf("GreenBasket Grocery Billing System\nLoaded %d products from %s.\n", product_count, PRODUCTS_FILE);
    for (;;) {
        printf("\n1. New bill\n2. Browse/search products\n3. Receive stock\n4. Low-stock list\n5. Daily sales report\n0. Exit\n");
        if (!read_int("Choose an option: ", &choice)) { printf("Enter a number from 0 to 5.\n"); continue; }
        if (choice == 0) break;
        switch (choice) {
            case 1: create_bill(products, product_count); break;
            case 2:
                if (!read_line("Search (leave blank for all): ", query, sizeof(query))) break;
                list_products(products, product_count, query); break;
            case 3: receive_stock(products, product_count); break;
            case 4:
                printf("\nLOW-STOCK PRODUCTS\n");
                for (choice = 0; choice < product_count; choice++) {
                    if (products[choice].stock <= products[choice].min_stock)
                        printf("%-14s %-28.28s %.3f %s (minimum %.3f)\n", products[choice].sku,
                               products[choice].name, products[choice].stock, products[choice].unit,
                               products[choice].min_stock);
                }
                break;
            case 5: daily_report(); break;
            default: printf("Choose an option from 0 to 5.\n");
        }
    }
    printf("Goodbye.\n");
    return EXIT_SUCCESS;
}

