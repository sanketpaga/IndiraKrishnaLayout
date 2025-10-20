export const environment = {
  production: true,
  googleSheets: {
    apiKey: 'AIzaSyB9El5v_GzgJDNcGqWVgh5MiVn3klbHtug', // For read-only operations
    spreadsheetId: '1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbw52XnUmtMbCBdI73ANekzmaJStOhnU1ELddUG7TIZ85xWmepdJxGXso765FKFTtL2kjg/exec', // For write operations
    sheets: {
      plots: 'Plots',
      payments: 'Payments',
      customers: 'Customers'
    }
  }
};
