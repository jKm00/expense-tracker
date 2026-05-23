# TODO

## App navigation

- [x] Re-order the items in the desktop sidebar. Should be: 1. Home, 2. Transactions, 3. Analytics, 4. Shopping, 5. Products, 6. Recurring, 7. Tags, 8. Automation
- [x] Re-order items in more page: Remove shopping, Move automation and profile into its own list with a small gap between the two lists.
- [x] Clicking the profile in the desktop sidebar should navigate to the profile page, not the more page

## Shopping list feature fixes

- [x] Simplify product select: Remove checkout button (already one in the header/summary component), remove the add button (when selecting a product from the dropdown, add it to the list), remove all the surrounding stuff of labels and descriptions and card border/background
- [x] Disable "checkout" button/link when no items are checked
- [x] Simplify checkout page: Remove the surrounding card, simplify the add product part here as well (should be similiar to the simplification in the shopping list page)
- [x] Add client validation (if a product is missing price or quantity, show and inline error at the input with a red boarder around the input instead of trying to submit the form)
- [x] On checkout submit, navigate to the transaction page
