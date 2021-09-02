import React from 'react'
import 'materialize-css'
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom'
import { ExportsPage } from './pages/ExportsPage'
import {AccountPage}  from './pages/AccountPage';

function App() {
  return (
    <div >
      <BrowserRouter>
        <Switch>
          <Route path="/exports/:id">
            <AccountPage />
          </Route>
          <Route path="/exports">
            <ExportsPage />
          </Route>

          <Redirect to="/exports" />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;


