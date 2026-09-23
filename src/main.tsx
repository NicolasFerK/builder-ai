try {
  console.log("Attempting to import React...");
  import('react').then(React => {
    console.log("React imported successfully");
    import('react-dom/client').then(ReactDOM => {
      console.log("ReactDOM imported successfully");
      console.log("REACT IS WORKING");
      
      const rootElement = document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
          React.createElement('h1', { 
            style: { 
              color: 'red', 
              fontSize: '50px', 
              textAlign: 'center',
              marginTop: '100px'
            } 
          }, 'REACT IS WORKING!')
        );
      } else {
        console.error("ROOT ELEMENT NOT FOUND");
        const fallback = document.createElement('h1');
        fallback.innerText = "ROOT NOT FOUND, FALLBACK ACTIVE";
        document.body.appendChild(fallback);
      }
    }).catch(e => console.error("ReactDOM import failed", e));
  }).catch(e => console.error("React import failed", e));
} catch (e) {
  console.error("Top level catch", e);
}
