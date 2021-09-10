import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Redirect, useParams } from 'react-router-dom';
import { useHttp } from '../hooks/http.hook';
import { useMessage } from '../hooks/message.hook';
import Select from 'react-select';
import Iframe from 'react-iframe';
import '../style.scss';
import psl from 'psl'
import { render } from 'react-dom';

export const AccountPage = () => {
       const { loading, request, error, clearError } = useHttp(); 
       const message = useMessage();
       const [currentAccount, setCurrentAccount] = useState({})
       const [categories, setCategories] = useState([])
       const [selectCategories, setSelectCategories] = useState([])
       const [activeLink, setActiveLink] = useState({})
       const [activeDomain, setActiveDomain] = useState('')
       const [activeFullDomain, setActiveFullDomain] = useState()
       const [blackDomains, setBlackDomains] = useState([])
       const [filterLinks, setFilterLinks] = useState([])
       const [domainFilterLinks, setDomainFilterLinks] = useState([]);
       const [isFullDomain, setIsFullDomain] = useState(false)
       const [isDomain, setIsDomain] = useState(false)
       const [isActiveLinkTaplink, setIsActiveLinkTaplink] = useState();
const [activeTabStatus, setActiveTabStatus] = useState();
       const [activeStatus, setActiveStatus] = useState(false);
       const [textNewCategory, setTextNewCategory] = useState('')
       const [isDefaultCategory, setIsDefaultCategory] = useState(false)

       let {id} = useParams();
const event = new MouseEvent('click', {
  view: window,
  bubbles: true,
  cancelable: false,
});
const initDefaultValue = (data) => {
 
  setCurrentAccount(data.currentAccount);
  setFilterLinks(data.currentAccount.links.filterLinks);
  setDomainFilterLinks(data.currentAccount.links.domainFilterLinks);
  const statusCheckbox =  document.getElementById('status-accept');

  const firstLink = document.querySelector(
    '.account__header-filter-item:first-child input',
  );
  const firstRadio = document.querySelector(
    '.account__header-checkbox-goodsite:first-of-type',
  );

statusCheckbox.dispatchEvent(event);
firstLink.dispatchEvent(event);
  firstRadio?.dispatchEvent(event);

     var elems = document.querySelectorAll('.collapsible');
     var instances = window.M.Collapsible.init(elems, {
       accordion: false,
     });
};



////EVENTS

///CHECKBOX
const ChangeHandlerActiveStatus  = (event) => {
  let newStatus = event.target.id;
  setActiveStatus(newStatus);
setCurrentAccount((old) => ({ ...old, status: newStatus }));
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
    setActiveTabStatus( event.target.value)
};
const ChangeHandlerLink = (event) => {
  console.log(selectCategories);
  let newSelectedSite = event.target.value;
  let newSelectedSiteImage= event.target.dataset.image;
  setIsActiveLinkTaplink(event.target.id == 'taplink' ? true : false)
  setActiveLink( { link: newSelectedSite, image: newSelectedSiteImage});
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
 
  // console.log(domains);
   setBlackDomains(domains);
};

///SELECT
const ChangeHandlerCategory = (event, {action}) => {
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
       const data = await request(`/api/exports/${id}`, 'POST', {
         currentAccount: currentAccount,
         blackDomains: blackDomains,
       });
       message(data.message);
       window.location.reload();
       console.log('GET WORK AFTER POST ');
     } catch (e) {
       console.log(e.message);
     }
   };
 

   const ClickHandlerAddCategory = async (text) => {
     try {
       const data = await request('/api/category/add', 'POST', {
         nameCategory: textNewCategory,
       });
       message(data.message);
setTextNewCategory('');
GetListCategory();
     } catch (e) {
           console.log(e.message);
     }
   }
 
   const ClickHandlerAddKeyWord = async (obj) => {
     try {
         const button = obj.target.closest('button');
       const keyWordInput = document.querySelector(
         `input[name=keyword-${button.dataset.id}]`,
       );
      const textNewKeyWord = keyWordInput.value;
       const data = await request('/api/category/keyword/add', 'POST', {
         nameKeyWord: textNewKeyWord,
         idCategory: button.dataset.id,
       });
       message(data.message);
       keyWordInput.value = '';
       GetListCategory();
     } catch (e) {
       console.log(e.message);
     }
   };


   const ClickHandlerRemoveKeyWord = async (obj) => {
     try {
       const button = obj.target.closest('button');
       const data = await request('/api/category/keyword/remove', 'POST', {
         removeKeyWord: button.dataset.keyword,
         idCategory: button.dataset.id,
       });
       message(data.message);
       GetListCategory();
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

if (!isDefaultCategory && Object.keys(currentAccount).length !== 0) {
  const defaultCategories = currentAccount.Category.map((catAcc) => {
    let catIndex = categories.findIndex((cat) => {
      return cat._id == catAcc;
    });
    if (catIndex !== -1) {
      return {
        value: categories[catIndex]._id,
        label: categories[catIndex].name,
      };
    }
  });

  setSelectCategories(defaultCategories);
  setIsDefaultCategory(true);
}
}, [categories])

useEffect(() => {

  //console.log(currentAccount);
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
        : activeLink.link,
    },
  }));
}, [isFullDomain,isDomain,activeLink])

useEffect(() => {
  message(error);
  clearError();
}, [error, message, clearError]);

useEffect(() => {
  console.log('GET WORK USE EFFECT');
  GetCurrentAccount();
}, []);

useEffect(() => {
  
                 const firstRadio = document.querySelector(
                   '.account__header-checkbox-goodsite:first-of-type',
                 );
                 firstRadio?.dispatchEvent(event);
}, [activeTabStatus])

const GetCurrentAccount = async () => {
  try {
    const data = await request(`/api/exports/${id}`, 'GET');
    message(data.message);
    if(data.currentAccount != '') {
 
    initDefaultValue(data);
     await GetListCategory();
    } 
      
    

  } catch (e) {
    console.log(e.message);
  }
};

const GetListCategory = async () => {
  try {
    const data = await request(`/api/category/list`, 'GET');
    message(data.message);
    setCategories(data.allCategories);
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
function renderParsedLinks(link) {
  if (currentAccount.messengers.whatsApp.indexOf(link) !== -1) {
 return({ linkClass: 'account__header-filter-item--whatsapp', linkIcon: 'whatsapp',
  linkOrder: 2})
  } else 
    if (currentAccount.messengers.telegram.indexOf(link) !== -1) {
 return({ linkClass: 'account__header-filter-item--telegram', linkIcon: 'telegram', 
 linkOrder: 3})
  } else 
    if (currentAccount.messengers.viber.indexOf(link) !== -1) {
      return {
        linkClass: 'account__header-filter-item--viber',
        linkIcon: 'viber',
        linkOrder: 4,
      };
    } else if (
      currentAccount.links.filterLinks.findIndex((filterLink) => {
        return filterLink.link === link;
      }) === -1
    ) {
      return {
        linkClass: 'account__header-filter-item--blacklist',
        linkIcon: 'remove_circle', 
        linkOrder: 1
      };
    } else {
      return '';
    }
}  

function renderLink(parsedLink, linkIcon, linkClass) {
  return (
    <div
      className={
        'account__header-filter-item account__header-filter-item--' + linkClass
      }>
      <i className="material-icons">{linkIcon}</i>
      <input
        className="account__header-filter-radio"
        name="selectedLink"
        id={`selectedLink-${parsedLink}`}
        type="radio"
        value={parsedLink}
      />
      <label htmlFor={`selectedLink-${parsedLink}`}>{parsedLink}</label>
      <a
        className="account__header-filter-link"
        href={parsedLink}
        target="_blank"
        rel="noopener noreferrer">
        <i className="material-icons">open_in_new</i>
      </a>
    </div>
  );
}

  return (
    <>
      {Object.keys(currentAccount).length !== 0 && filterLinks.length !== 0 ? (
        <div className="account">
          <header className="account__header"></header>
          <aside className="account__aside account__aside-left">
            <div className="account__header-status-box">
              <input
                className="account__header-status-radio account__header-status-radio--green"
                name="status"
                id="status-accept"
                type="radio"
                value="accept"
                onChange={ChangeHandlerStatus}
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
              {activeTabStatus == 'denied' ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="denied-radio"
                    id="deniedGoodSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="deniedGoodSite">
                    Сайт хороший ! Добавим в подборку
                  </label>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="denied-radio"
                    id="deniedBadSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="deniedBadSite">
                    Сайт плохой или это не наш клиент
                  </label>
                </>
              ) : (
                ''
              )}
              {activeTabStatus == 'accept' &&
              currentAccount.links.instagramLink.includes('taplink') ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="accept-taplink-radio"
                    id="acceptTaplinkNoSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="acceptTaplinkNoSite">
                    Это таплинк без сайта
                  </label>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="accept-taplink-radio"
                    id="acceptTaplinkWithSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="acceptTaplinkWithSite">
                    Это таплинк с плохим сайтов
                  </label>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="accept-taplink-radio"
                    id="acceptTaplinkMultipage"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="acceptTaplinkMultipage">
                    Это таплинк многостраничник
                  </label>
                </>
              ) : (
                ''
              )}
              {activeTabStatus == 'accept' &&
              !currentAccount.links.instagramLink.includes('taplink') ? (
                <>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="accept-radio"
                    id="acceptNoSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="acceptNoSite">Сайта нет</label>
                  <input
                    className="account__header-checkbox-goodsite"
                    type="radio"
                    name="accept-radio"
                    id="acceptBadSite"
                    onChange={ChangeHandlerActiveStatus}
                  />
                  <label htmlFor="acceptBadSite">Сайта плохой</label>
                </>
              ) : (
                ''
              )}

              <p className="account__header-desc">
                {currentAccount.description}
              </p>
              {categories.length !== 0 && isDefaultCategory ? (
                <Select
                  defaultValue={selectCategories}
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
                      <div className="collapsible-input-box">
                        <input
                          type="text"
                          name="category-name"
                          placeholder="Новая категория..."
                          className="collapsible-input"
                          value={textNewCategory}
                          onChange={(text) => {
                            setTextNewCategory(text.target.value);
                          }}
                        />
                        <button
                          disabled={!textNewCategory}
                          className="collapsible-button btn-floating "
                          onClick={ClickHandlerAddCategory}>
                          <i className="material-icons">add</i>
                        </button>
                      </div>
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
                                  <div className="collapsible-input-box">
                                    <input
                                      type="text"
                                      name={'keyword-' + cat.value}
                                      placeholder="Новое слово..."
                                      className="collapsible-input"
                                      onChange={(obj) => {
                                        obj.target.value
                                          ? (document.querySelector(
                                              `button[data-id="${cat.value}"]`,
                                            ).disabled = false)
                                          : (document.querySelector(
                                              `button[data-id="${cat.value}"]`,
                                            ).disabled = true);
                                      }}
                                    />
                                    <button
                                      data-id={cat.value}
                                      className="collapsible-button btn-floating "
                                      onClick={ClickHandlerAddKeyWord}>
                                      <i className="material-icons">add</i>
                                    </button>
                                  </div>
                                  <ul className="collapsible-keyword-list">
                                    {categories[catIndex].keyWords.map(
                                      (keyWord) => {
                                        return (
                                          <li className="collapsible-keyword-item">
                                            {keyWord}
                                            <button
                                              onClick={
                                                ClickHandlerRemoveKeyWord
                                              }
                                              data-id={cat.value}
                                              data-keyword={keyWord}
                                              className="collapsible-keyword-remove-btn">
                                              <i className="material-icons">
                                                close
                                              </i>
                                            </button>
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
            <a
              href={`https://www.instagram.com/${currentAccount.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="account__aside-instagram-link">
              {currentAccount.login}
              <i className="material-icons">open_in_new</i>
            </a>
            <div className="account__header-filter-list">
              {currentAccount.links.instagramLink.includes('taplink') ? (
                <div
                  className={
                    'account__header-filter-item ' +
                    (activeLink.link == currentAccount.links.instagramLink
                      ? 'account__header-filter-item--active'
                      : '')
                  }>
                  <i className="material-icons">my_location</i>
                  <input
                    className="account__header-filter-radio"
                    name="selectedLink"
                    id="taplink"
                    type="radio"
                    value={currentAccount.links.instagramLink}
                    data-image={currentAccount.links.tapLinkImage}
                    onChange={ChangeHandlerLink}
                  />
                  <label htmlFor="taplink">
                    {currentAccount.links.instagramLink}
                  </label>
                  <a
                    className="account__header-filter-link"
                    href={currentAccount.links.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer">
                    <i className="material-icons">open_in_new</i>
                  </a>
                </div>
              ) : (
                ''
              )}

              {filterLinks.map((filterLink, i) => {
                return (
                  <div
                    className={
                      'account__header-filter-item ' +
                      (activeLink.link == filterLink.link
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
                      id={`selectedLink-${filterLink.link}`}
                      type="radio"
                      value={filterLink.link}
                      data-fulldomain={
                        currentAccount.links.domainFilterLinks[i]
                      }
                      data-domain={psl.get(
                        currentAccount.links.domainFilterLinks[i],
                      )}
                      data-image={filterLink.image}
                      onChange={ChangeHandlerLink}
                    />
                    <label htmlFor={`selectedLink-${filterLink.link}`}>
                      {filterLink.link}
                    </label>
                    <a
                      className="account__header-filter-link"
                      href={filterLink.link}
                      target="_blank"
                      rel="noopener noreferrer">
                      <i className="material-icons">open_in_new</i>
                    </a>
                  </div>
                );
              })}

              {currentAccount.links.parsedLinks.map((parsedLink) => {
                if (
                  currentAccount.links.filterLinks.findIndex((filterLink) => {
                    return filterLink.link === parsedLink;
                  }) === -1 &&
                  currentAccount.messengers.whatsApp.indexOf(parsedLink) ===
                    -1 &&
                  currentAccount.messengers.telegram.indexOf(parsedLink) ===
                    -1 &&
                  currentAccount.messengers.viber.indexOf(parsedLink) === -1
                ) {
                  return renderLink(parsedLink, 'remove_circle', 'blacklist');
                }
              })}

              {currentAccount.messengers.whatsApp.map((parsedLink) => {
                return renderLink(parsedLink, 'whatsapp', 'whatsapp');
              })}
              {currentAccount.messengers.telegram.map((parsedLink) => {
                return renderLink(parsedLink, 'telegram', 'telegram');
              })}
              {currentAccount.messengers.viber.map((viberLink) => {
                return renderLink(viberLink, 'viber', 'viber');
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
            <div className="account__footer-btn-box">
              <button className="btn-large  red lighten-1">Назад</button>
              <button
                disabled={
                  selectCategories.length !== 1 ||
                  (isActiveLinkTaplink &&
                    currentAccount.status !== 'acceptTaplinkNoSite' &&
                    currentAccount.status !== 'acceptTaplinkMultipage') ||
                  (!isActiveLinkTaplink &&
                    (currentAccount.status === 'acceptTaplinkNoSite' ||
                      currentAccount.status === 'acceptTaplinkMultipage'))
                }
                className="btn-large  green lighten-1"
                onClick={ClickHandlerNextAcc}>
                Далее
              </button>
            </div>
          </aside>
          <main className="account__body">
            <div className="account__site-img-box">
              {activeLink.image ? (
                <img
                  src={process.env.PUBLIC_URL + '/uploads/' + activeLink.image}
                  alt=""
                  onError={
                    (obj) => {
                      obj.target.src = window.location.origin + 'no-image.png';
                    }
                    // process.env.PUBLIC_URL + 'no-image.png'
                  }
                />
              ) : (
                <p>Скриншот не сделан. Скорее всего сайт не работает</p>
              )}
            </div>
          </main>
          {/* <aside className="account__aside account__aside-right">right </aside> */}
          <footer className="account__footer"></footer>
        </div>
      ) : (
        <NavLink className='account__btn-home btn btn-large' to='/exports/'>На главную</NavLink>
      )}
    </>
  );
};

