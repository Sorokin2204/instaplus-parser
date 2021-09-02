import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom';
import { useHttp } from '../hooks/http.hook';
import { useMessage } from '../hooks/message.hook';
import Select from 'react-select';
import Iframe from 'react-iframe';
import '../style.scss';
import psl from 'psl'

export const AccountPage = () => {
       const { loading, request, error, clearError } = useHttp(); 
       const message = useMessage();
       const [currentAccount, setCurrentAccount] = useState({})
       const [categories, setCategories] = useState([])
       const [selectCategories, setSelectCategories] = useState([])
       const [activeLink, setActiveLink] = useState('')
       const [activeDomain, setActiveDomain] = useState('')
       const [activeFullDomain, setActiveFullDomain] = useState()
       const [blackDomains, setBlackDomains] = useState([])
       const [filterLinks, setFilterLinks] = useState([])
       const [domainFilterLinks, setDomainFilterLinks] = useState([]);
       const [isFullDomain, setIsFullDomain] = useState(false)
       const [isDomain, setIsDomain] = useState(false)
       const [isGoodSite, setIsGoodSite] = useState(false)

       let {id} = useParams();

const initDefaultValue = (data) => {
  setCurrentAccount(data.currentAccount);
  setCategories(data.allCategories);
  setFilterLinks(data.currentAccount.links.filterLinks.slice());
  setDomainFilterLinks(data.currentAccount.links.domainFilterLinks.slice());
  const statusCheckbox =  document.getElementById('status-accept');
  const firstLink = document.querySelector(
    '.account__header-filter-item:first-child input',
  );
var event = new MouseEvent('click', {
  view: window,
  bubbles: true,
  cancelable: false,
});
statusCheckbox.dispatchEvent(event);
firstLink.dispatchEvent(event);
     var elems = document.querySelectorAll('.collapsible');
     var instances = window.M.Collapsible.init(elems, {
       accordion: false,
     });
};
////EVENTS

///CHECKBOX
const ChangeHandlerIsGoodSite  = (event) => {
  let newIsGoodSite = event.target.checked;
  setIsGoodSite(event.target.checked);
setCurrentAccount((old) => ({ ...old, isGoodSite: newIsGoodSite }));
}
const ChangeHandlerIsFullDomain = (event) => {
  let newIsFullDomain = event.target.checked;
setIsFullDomain(newIsFullDomain);
setIsDomain(false);
};
const ChangeHandlerIsDomain = (event) => {
  let newIsDomain = event.target.checked;
  setIsFullDomain(false);
  setIsDomain(newIsDomain);
 
};
///RADIO
const ChangeHandlerStatus = (event) => {
  let newStatus = event.target.value;
if(newStatus == 'accept') {
  setIsGoodSite(false);
  setCurrentAccount((old) => ({ ...old, status: newStatus , isGoodSite: false }));
} else {
  setCurrentAccount((old) => ({ ...old, status: newStatus }));
}

};
const ChangeHandlerLink = (event) => {
  let newSelectedSite = event.target.value;
  setActiveLink(newSelectedSite);
 setActiveFullDomain(event.target.dataset.fulldomain);
  setActiveDomain(event.target.dataset.domain);
  let domains = domainFilterLinks.map((item,index) => 
          (psl.get(item)) 
  ); 

  domains = domains.filter(function (item, pos) {
    return domains.indexOf(item) == pos;
  });

  domains = domains.filter(function (item, pos) {
    return (item !== event.target.dataset.domain)
  });
 
   console.log(domains);
   setBlackDomains(domains);
};

///SELECT
const ChangeHandlerCategory = (event) => {
  setSelectCategories(event);
setCurrentAccount((old) => ({
  ...old,
  Category: event.map((cat) => {
    return cat.value;
  }),
}));
};
///BUTTON

const ClickHandlerNextAcc = async () => {
     try { 
        // delete currentAccount.links.domainFilterLinks;
       const data = await request(`/api/exports/${id}`, 'POST', {
         currentAccount: currentAccount,
         blackDomains: blackDomains,
       });
       message(data.message);
     GetCurrentAccount();
     } catch (e) {
       console.log(e.message);
     }
   };
 
 

// const ClickHandlerRemoveDomain = (event) => {
//    setBlackDomains((old) => [...old, activeDomain]);
//   setActiveDomain(event.target.value);
// };

////HOOKS
useEffect(() => {

  console.log(currentAccount);
}, [currentAccount]);


useEffect(() => {
  setCurrentAccount((old) => ({
    ...old,
    links: {
      ...old.links,
      selectedLink: isFullDomain
        ? 'http://' + activeFullDomain
        : isDomain
        ? 'http://' + activeDomain
        : activeLink,
    },
  }));
}, [isFullDomain,isDomain,activeLink])

useEffect(() => {
  message(error);
  clearError();
}, [error, message, clearError]);

useEffect(() => {
  GetCurrentAccount();
}, []);
const GetCurrentAccount = async () => {
  try {
    const data = await request(`/api/exports/${id}`, 'GET');
    message(data.message);
    //console.log(data.currentAccount);
    initDefaultValue(data);
  } catch (e) {
    console.log(e.message);
  }
};
// useEffect(() => {
//   if (blackDomains.length !== 0) {
//  let newLinks = [];
//  let newDomain = [];
//  currentAccount.links.domainFilterLinks.map((domain, index) => {
//    if (domain == activeDomain) {
//      newLinks.push(currentAccount.links.filterLinks[index]);
//      newDomain.push(domain);
//    }
//  });

//  setCurrentAccount((oldAcc) => ({
//    ...oldAcc,
//    links: { filterLinks: newLinks, domainFilterLinks: newDomain },
//  }));
//   }

// }, [activeDomain]);
    

  return (
    <>
      {Object.keys(currentAccount).length !== 0 && filterLinks.length !== 0 ? (
        <div className="account">
          <header className="account__header">
            <div className="account__header-status-box">
              <input
                className="account__header-status-radio account__header-status-radio--green"
                name="status"
                id="status-accept"
                type="radio"
                value="accept"
                onChange={(e) => {
                  ChangeHandlerStatus(e);
                }}
              />
              <label htmlFor="status-accept">Берем</label>

              <input
                className="account__header-status-radio account__header-status-radio--red  "
                name="status"
                id="status-denied"
                type="radio"
                value="denied"
                onChange={ChangeHandlerStatus}
              />
              <label htmlFor="status-denied">Не берем</label>
            </div>
            <div className="account__header-content">
              {currentAccount.status == 'denied' ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="checkbox"
                    name="isGoodSite"
                    id="isGoodSite"
                    onChange={ChangeHandlerIsGoodSite}
                    checked={isGoodSite}
                  />
                  <label htmlFor="isGoodSite">
                    Сайт хороший ! Добавим в подборку
                  </label>
                </>
              ) : (
                <div style={{ height: '44px' }}></div>
              )}

              <p className="account__header-desc">
                {currentAccount.description}
              </p>
              {categories.length !== 0 ? (
                <Select
                  defaultValue={currentAccount.Category.map((catAcc) => {
                    let catIndex = categories.findIndex((cat) => {
                      return cat._id == catAcc;
                    });
                    if (catIndex !== -1) {
                      return {
                        value: categories[catIndex]._id,
                        label: categories[catIndex].name,
                      };
                    }
                  })}
                  placeholder={'Выберите категорию...'}
                  isMulti
                  name="Category"
                  options={categories.map((cat) => {
                    return { value: cat._id, label: cat.name };
                  })}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={ChangeHandlerCategory}
                />
              ) : (
                ''
              )}
              <div className="collapsible-box">
                <ul className="collapsible">
                  <li>
                    <div className="collapsible-header">Ключевые слова</div>
                    <div className="collapsible-body">
                      <ul className="collapsible-list">
                        {selectCategories.length !== 0
                          ? selectCategories.map((cat) => {
                              let catIndex = categories.findIndex((allCat) => {
                                return allCat._id == cat.value;
                              });
                              return (
                                <li className="collapsible-item">
                                  <p className="collapsible-item-header">
                                    {categories[catIndex].name}
                                  </p>
                                  <ul className="collapsible-keyword-list">
                                    {categories[catIndex].keyWords.map(
                                      (keyWord) => {
                                        return (
                                          <li className="collapsible-keyword-item">
                                            {keyWord}
                                          </li>
                                        );
                                      },
                                    )}
                                  </ul>
                                </li>
                              );
                            })
                          : ''}
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </header>
          <aside className="account__aside account__aside-left">
            <a
              href={`https://instagram.com/${currentAccount.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="account__aside-instagram-link">
              {currentAccount.login}{' '}
              <i className="material-icons">open_in_new</i>
            </a>
            <div className="account__header-filter-list">
              {filterLinks.map((link, i) => {
                return (
                  <div
                    className={
                      'account__header-filter-item ' +
                      (activeLink == link
                        ? 'account__header-filter-item--active'
                        : '')
                      //   +
                      // (currentAccount.links.filterLinks.indexOf(link) !== -1
                      //   ? 'account__header-filter-item--selected'
                      //   : '')
                    }>
                    <input
                      className="account__header-filter-radio"
                      name="selectedLink"
                      id={`selectedLink-${link}`}
                      type="radio"
                      value={link}
                      data-fulldomain={
                        currentAccount.links.domainFilterLinks[i]
                      }
                      data-domain={psl.get(
                        currentAccount.links.domainFilterLinks[i],
                      )}
                      onChange={ChangeHandlerLink}
                    />
                    <label htmlFor={`selectedLink-${link}`}> {link}</label>
                    <a
                      className="account__header-filter-link"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer">
                      <i className="material-icons">open_in_new</i>
                    </a>
                  </div>
                );
              })}
              {activeFullDomain ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="checkbox"
                    name="isFullDomain"
                    id="isFullDomain"
                    onChange={ChangeHandlerIsFullDomain}
                    checked={isFullDomain}
                  />

                  <label htmlFor="isFullDomain">
                    Поддомен: {activeFullDomain}
                    <a
                      className="account__header-filter-link"
                      href={'http://' + activeFullDomain}
                      target="_blank"
                      rel="noopener noreferrer">
                      <i className="material-icons">open_in_new</i>
                    </a>
                  </label>
                </>
              ) : (
                ''
              )}
              {activeDomain ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="checkbox"
                    name="isDomain"
                    id="isDomain"
                    onChange={ChangeHandlerIsDomain}
                    checked={isDomain}
                  />

                  <label htmlFor="isDomain">
                    Домен: {activeDomain}
                    <a
                      className="account__header-filter-link"
                      href={'http://' + activeDomain}
                      target="_blank"
                      rel="noopener noreferrer">
                      <i className="material-icons">open_in_new</i>
                    </a>
                  </label>
                </>
              ) : (
                ''
              )}

              {
                // domainFilterLinks.map((domain, index) => {
                //   if (domainFilterLinks.indexOf(domain) === index) {
                //     return (
                //       <div
                //         className={
                //           'account__header-filter-item ' +
                //           (activeDomain == domain
                //             ? 'account__header-filter-item--active'
                //             : '')
                //         }>
                //         <input
                //           className="account__header-filter-radio"
                //           name="selectedLink"
                //           id={`selectedLink-${domain}`}
                //           type="radio"
                //           value={domain}
                //           onChange={ClickHandlerRemoveDomain}
                //         />
                //         <label htmlFor={`selectedLink-${domain}`}> {domain}</label>
                //         <i className="material-icons">check</i>
                //       </div>
                //     );
                //   }
                // })
              }
            </div>
          </aside>
          <main className="account__body">
            {/* <Iframe
              url={activeLink}
              width="450px"
              height="450px"
              id="myId"
              className="myClassname"
              display="initial"
              position="relative"
              frameborder="0"
            /> */}
            <img src={process.env.PUBLIC_URL + '/uploads/' + currentAccount.links.imageFilterLinks[currentAccount.links.filterLinks.indexOf(activeLink)]} alt="" />
            {/* <iframe src={activeLink} frameBorder="0" loading="lazy"></iframe> */}
          </main>
          {/* <aside className="account__aside account__aside-right">right </aside> */}
          <footer className="account__footer">
            <div className="account__footer-btn-box">
              <button className="btn-large  red lighten-1">Назад</button>
              <button
                disabled={selectCategories.length !== 1}
                className="btn-large  green lighten-1"
                onClick={ClickHandlerNextAcc}>
                Далее
              </button>
            </div>
          </footer>
        </div>
      ) : (
        ''
      )}
    </>
  );
};
