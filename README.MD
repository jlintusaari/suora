# Suora framework

This repository contains the sources of a javascript library named Suora that I wrote in 2014 for project I was working on.
The idea was to provide a fast and much simplified version of the current Angular framework at the time (1st version) without the 2 way
binding that I found to be too slow.

The project required the rendering of thousands of records at one go with which you should also be able to interact with.
The implementation of the 2-way binding in Angular at the time bloated the DOM with event listeners and triggres and it took several
seconds to render the several thousands of records individually to the view with a decent computer.

However I very much liked the idea in Angular of controllers, scopes and variable interpolations within the HTML. 
The simplifications in Suora included that Angular scopes were the same as controllers and there was no as sophisticated 2-way magic but instead parts of the DOM
were re-rendered when requested (e.g. after clicking a save button).

## Organization of Suora

Suora included controllers objects that provided access to data via custom functions and variables.
Partials took control of rendering parts of the DOM and retrieved the data they needed by using functions and variables within their controller object.
Database records were accessed through global services that any controller could get an access to.
Suora also provided filters for modifying the outputs of variable interpolations with the piping symbol |.

The `core.js` file creates the Suora closure object called `s` with the module pattern (note that this was the way to do it before ES6).
Once the browser had completed loading the DOM, Suora executed and traversed through the DOM and compiled controllers and partials it found
within the DOM.

There were two types of partials, one-timers that would render their portion once and then be disposed, and those that would persist and assume 
control of their portion of the DOM.
These partials could provide an update hook or even a public API that could be accessed by Suora, controllers or other partials.
Through the update hook or the API, the partial could be rerendered to the DOM or it's view altered.

Suora also supported nested or overlapping partials.
Such a partial could for instance set a single event listener for a list of thousands of records and capture a bubbling event from any of those records 
thus avoiding the setting of event listeners for every record individually.

## Example Suora html templates

These examples are adapted from the project I was working on with at the time.

The following partial (`m-bind`, m for `mustache.js`) would get customer data by calling its controller's `getCustomer` method and then placed the customer details to DOM.
If data changed and it's update hook was called it would re-render it's DOM portion.

```javascript
<div class="page-header printable">
    <h3>Sales for <small data-m-bind="getCustomer"> {{lastname}}, {{firstname}} ({{id}})</small></h3>
</div>
```

This partial `m-repeat` would get the `sales` object of it's controller that contained an array of sales and then repeat the rendering for each object in the array. 
As with the above, the rendering would be redone only if the partial's update hook was called.

```javascript
    <tbody data-m-repeat="sales">
        <tr>
            <td>{{date|datetime}}</td>
            <td>{{product_id}}</td>
            <td>{{product_name}}</td>
            <td>{{price|price}}</td>
            <td>{{quantity}}</td>
            <td>{{discount_percentage|percentage}}</td>
        </tr>
    </tbody>
```



