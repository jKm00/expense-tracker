# TODO

## Transactions

- [ ] Update transaction (price, type, date, description)
- [ ] Delete transaction (w/ alert dialog)

## Product

- [ ] Create product manually (Currently only created via new transaction)
- [ ] Update product (name)
- [ ] Delete product (w/ alert dialog)

## PWA

- [ ] Add whatever is necessary to make this into a PWA
- [ ] If possible, make it so /dashboard is the default side opened when the app is downloaded as a PWA and opend through this download. When browsed defaully through default browser, the '/' (landing) page can be the default side.

## Design

The entire application should be redesigned. Project uses shadcn component and these should be used throughout the application. Although, currently, the project uses the default shadcn style. This can be customized to whatever extend as long as the app uses the same components throughout so it feel uniform.

- [ ] Make it modern and beautiful. Focus on keeping the interface as clean/minimal as possible with little to no distractions. It should be as easy and fast as possible to use
- [ ] Handle all error cases: Each endpoint (tanstack server function) returns a result type of either 'err' or 'ok'. All 'err' states should be handled explicitely with custom error messages to provide the best user experience. Other errors handled by the tanstack query 'error' in 'useQuery' and 'useMutation' are unexpected errors and should be handled with a generic error messages. Difference between the usages of toast/sonner and static rendering of component. Use whatever is most fitting.
- [ ] Handle all loading states: All queries should be 'prefetched' in the page loader. However, this does not mean the content is ready when the user click links. To make the app feel as snappy as possible, unloaded data should not prevent them from navigating (navigation should not wait for data). Instead render beautiful skeleton loaders immediately and swap it out with actual content when this is ready.
- [ ] Update all forms: Most of the forms are currently implemented with ad-hoc solutions. They should all be refactored to use tanstack form (the edit-recurring.form.tsx is an example implementation). With this refactor, the styles and layouts of the forms should be updated. The design should also handle client side form validation (on blur) and show beautiful feedback message to the user for best experience. Form submit buttons should have appropriate loading states and disable states based on the state of the form (and action)
- [ ] The new design should focus on mobile use. It should have its own desktop design/layout enhanced for desktop usage, however, the app will mostly be used on mobile devices as PWAs, so it is critical that the mobile design and layout is nice, beautiful, and user friendly (typically with a bottom nav bar and other design elements that makes it feel more like a typical mobile application). NOTE: The desktop design should not have these typical mobile elements. The desktop design should be optimized for desktop use with standard dekstop elements and layouts.
