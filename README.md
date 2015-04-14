# HandCarousel.js
A neat multi-device carousel-slider 

## Dependencies
- Hand.js Polyfill https://handjs.codeplex.com/ 
- JQuery http://jquery.com/download/ 

## Browser Support
Support for Chrome, Firefox, Safari, iOS, Android, IE>8, ... Modern Browsers ;)

## Howto 
HandCarousel.js can be loaded either with/before/after JQuery is available since it is wrapped inside a function.
**Make sure that you have JQuery and Hand.js loaded in your website**.

HandCarousel will work out of the box but it will **NOT** style/design your slider. You can style it as you would normally. *The DOM structure is not changed*. 

    ...
    <body>
      <div class="my-slider">
        <div class="elem-to-be-slided">
          Hello1!
        </div>
        <div class="elem-to-be-slided">
          Hello2!
        </div>
        <div class="elem-to-be-slided">
          <strong>Hello 3</strong>
        </div>
      </div>
      
      <script>
        $(window).ready(UseHandCarousel);
        var handCarousel = $('.my-slider').first().handCarousel();
      </script>
    </body>
    ...
  
