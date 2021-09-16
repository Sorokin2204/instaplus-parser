import moment from 'moment';
import React, { useRef, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useHttp } from '../hooks/http.hook'
import { useMessage } from '../hooks/message.hook';
import openSocket from 'socket.io-client';

const socket = openSocket('http://localhost:3000');

export const  ExportsPage = () => {
   const { loading, request, error, clearError} = useHttp();
   const [isDisabled, setIsDisabled] = useState(true)
    const excelFile = useRef();
    const newSenderAccounts = useRef();
    const message = useMessage();
    const [data, setData] = useState([]);
    const [senderAccounts, setSenderAccounts] = useState([]);
    const [loadingText, setLoadingText] = useState('');
    const changeHandlerAddFormExport = event => {
        excelFile.current.files[0] ? setIsDisabled(false) : setIsDisabled(true);
    }

    const ClickHandlerSendMessage = async (obj) => {
     try {
       
       const data = await request(`/api/exports/send/${obj.target.dataset.id}`, 'GET');
       message(data.message);
     } catch (e) {
       console.log(e.message);
     }
    }

    const ClickHandlerAddSenderAccounts = async (obj) => {
      try {
        const data = await request(`/api/exports/sender-accounts/add/`, 'POST', {
          listSenderAccounts: newSenderAccounts.current,
        });
        message(data.message);
        document.getElementById('listSenderAccounts').value = '';
        getSenderAccounts();
      } catch (e) {
        console.log(e.message);
      }
    };

   const ClickHandlerActiveSenderAccount = async (obj) => {
      try {
        
        const data = await request(`/api/exports/sender-accounts/reset/${obj.target.dataset.id}`, 'POST', {
        
        });
        message(data.message);
        getSenderAccounts();
      } catch (e) {
        console.log(e.message);
      }
    };
    

useEffect(() => {
   var elems = document.querySelectorAll('.modal');
   var instances = window.M.Modal.init(elems);
   getSenderAccounts();
  if(loadingText == '') {
    console.log('USE EFFECT LOADING');
         getFiles();
          //setIsDisabled(false);
  } 
}, [loadingText])

useEffect(() => {
  message(error);
  clearError();
}, [error, message, clearError]);
    
    const registerHandlerAddFormExport = async () => {
        const formData = new FormData();
		formData.append('excelFile', excelFile.current.files[0]);
        try {
           const data =  await request(
              '/api/exports/add',
              'POST', formData , {}, true
            );
             message(data.message);
              getFiles();
        } catch (e) {
            console.log(e.message);
        }
    }

    useEffect( () => {
        setIsDisabled(true);
      socket.on('connection', (loadData) => {
        console.log(loadData);
        setLoadingText(loadData);
      });

        //  getFiles();
},[]) 
      async function getFiles() {
        try {
          const dataFiles = await request('/api/exports/list', 'GET');
          console.log(dataFiles);
          if(dataFiles.findIndex((file) => { 
            return file.status === 'loading'
          }) !== -1) {
            setIsDisabled(true)
          } else  {
             setIsDisabled(false);
          }
          setData(dataFiles);
        } catch (e) {
          console.log(e.message);
        }
      }

      async function getSenderAccounts() {
        try {
          const dataFiles = await request(
            '/api/exports/sender-accounts/list/',
            'GET',
          );
          setSenderAccounts(dataFiles.senderAccounts);
        } catch (e) {
          console.log(e.message);
        }
      }





        function getFileStatus(status,countPending,id) {
          switch (status) {
            case 'active':
              return (
                <td class="td-red">
                  {`Осталось - ${countPending}`}
                  <NavLink to={'/exports/' + id}>Перейти</NavLink>
                </td>
              );
              break;
            case 'pendingSending':
              return (
                <td class="amber">
                  <div className="td-box">
                    <span className="td-text">Ожидаеться отправки</span>
                    <button
                      onClick={ClickHandlerSendMessage}
                      class="btn"
                      data-id={id}>
                      Отправить
                    </button>
                  </div>
                </td>
              );
              break;
            case 'loading':
              return (
                <td class="amber">
                  <div className="td-box">
                    <span className="td-text">Обработка...</span>
                  </div>
                </td>
              );
              break;
            default:
              break;
          }
        }

        const clickHandlerTableRow = (ev,e) => {
          let selectRowFile =ev.target.closest('tr');
          let selectRowId = selectRowFile.dataset.id;
          document.querySelectorAll('tr').forEach((tr) => {
            tr.classList.remove('tr-active')
          })
          selectRowFile.classList.add('tr-active');
        }

    return (
      <div>
        <div className="file-field input-field">
          <div className="btn">
            <span>1.Выбрать Excel</span>
            <input
              type="file"
              name="excelFile"
              id="excelFile"
              ref={excelFile}
              onChange={changeHandlerAddFormExport}
              accept=".xlsx"
              disabled={isDisabled}
            />
          </div>
          <div className="file-path-wrapper">
            <input
              className="file-path validate"
              type="text"
              disabled={isDisabled}
            />
          </div>
          <button
            onClick={registerHandlerAddFormExport}
            className="waves-effect waves-light btn"
            disabled={isDisabled}>
            2.Загрузить
          </button>
          {loading ? (
            <div className="preloader-wrapper active">
              <div className="spinner-layer spinner-red-only">
                <div className="circle-clipper left">
                  <div className="circle"></div>
                </div>
                <div className="gap-patch">
                  <div className="circle"></div>
                </div>
                <div className="circle-clipper right">
                  <div className="circle"></div>
                </div>
              </div>
            </div>
          ) : (
            ''
          )}
          <span>{loadingText}</span>
        </div>

        <button data-target="modal1" class="btn modal-trigger">
          Аккаунты
        </button>

        <div id="modal1" class="modal modal-fixed-footer">
          <div class="modal-content">
            <h4>Аккаунты отправители</h4>
            <textarea
              className="materialize-textarea"
              name="listSenderAccounts"
              id="listSenderAccounts"
              cols="30"
              rows="10"
              placeholder="Вставьте список аккаунтов, каждый должен быть с новой строки"
              onChange={(obj) => {
                newSenderAccounts.current = obj.target.value;
              }}></textarea>
            <button className="btn" onClick={ClickHandlerAddSenderAccounts}>
              Добавить
            </button>

            {senderAccounts && senderAccounts.length != 0 ? (
              <div className="row">
                <table style={{ padding: '0px' }}>
                  <thead>
                    <tr>
                      <th>Логин</th>
                      <th>Пароль</th>
                      <th>Последняя отправка</th>
                      <th>Статус</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {senderAccounts.map((acc) => {
                      return (
                        <tr>
                          <td>{acc.login}</td>
                          <td>{acc.password}</td>

                          {moment(acc.lastSentDate).isAfter(new Date()) ||
                          !acc.lastSentDate ? (
                            <td className="td-green">
                              {!acc.lastSentDate
                                ? '-'
                                : moment(acc.lastSentDate).format(
                                    'DD.MM.YYYY  HH:MM:SS',
                                  )}
                            </td>
                          ) : (
                            <td className="td-red">
                              {moment(acc.lastSentDate).format(
                                'DD.MM.YYYY  HH:MM:SS',
                              )}
                            </td>
                          )}

                          {acc.isWork ? (
                            <td className="td-green">Работает</td>
                          ) : (
                            <td className="td-red">Не работает</td>
                          )}
                          <td>
                            <button className="btn" data-id={acc._id} onClick={ClickHandlerActiveSenderAccount}>
                              Сброс
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              ''
            )}
          </div>
          <div class="modal-footer">
            <a href="#!" class="modal-close waves-effect waves-green btn-flat">
              Закрыть
            </a>
          </div>
        </div>

        {/* <input
          type="file"
          name="excelFile"
          id="excelFile"
          ref={excelFile}
          onChange={changeHandlerAddFormExport}
          accept=".xlsx"
        /> */}
        {/* <button onClick={registerHandlerAddFormExport}>Загрузить</button> */}
        {/* {loading ? (
          <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-red-only">
              <div className="circle-clipper left">
                <div className="circle"></div>
              </div>
              <div className="gap-patch">
                <div className="circle"></div>
              </div>
              <div className="circle-clipper right">
                <div className="circle"></div>
              </div>
            </div>
          </div>
        ) : (
          ''
        )} */}

        {data && data.length != 0 ? (
          <div className="row">
            <table style={{ padding: '0px' }}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Название</th>
                  <th>Всего</th>
                  <th>Проанализированно</th>
                  <th class="td-gray">Повторных</th>
                  <th class="td-green">Принято</th>
                  <th>Без сайта</th>
                  <th>С плохим сайтом</th>
                  <th>Таплинк без сайта</th>
                  <th>Таплинк с плохим сайтом</th>
                  <th>Таплинк-лендинг</th>
                  <th>Отправленно</th>
                  <th class="td-red">Отклонено</th>
                  <th>Статус</th>
                </tr>
              </thead>

              <tbody>
                {data.map((file) => {
                  return file.status == 'loading' ||
                    file.status == 'errorLoading' ? (
                    <tr data-id={file._id} onClick={clickHandlerTableRow}>
                      <td>
                        {moment(file.dateCreated).format(
                          'DD.MM.YYYY  HH:MM:SS',
                        )}
                      </td>
                      <td>{file.excelFileName}</td>
                      <td>-</td>
                      <td>-</td>
                      <td className="td-gray">-</td>
                      <td className="td-green">-</td>
                      <td className="td-red">-</td>
                      {getFileStatus(
                        file.status,
                        file.accountsPendingProcessingCount,
                        file._id,
                      )}
                    </tr>
                  ) : (
                    <tr data-id={file._id} onClick={clickHandlerTableRow}>
                      <td>
                        {moment(file.dateCreated).format(
                          'DD.MM.YYYY  HH:MM:SS',
                        )}
                      </td>
                      <td>{file.excelFileName}</td>
                      <td>{file.accountsAllCount}</td>
                      <td>{file.accountsAnalyzedCount}</td>
                      <td className="td-gray">{file.accountsRepeatingCount}</td>
                      <td className="td-green">{file.accountsAcceptCount}</td>
                      <td>{file.accountsAcceptNoSite}</td>
                      <td>{file.accountsAcceptBadSite}</td>
                      <td>{file.accountsAcceptTaplinkNoSite}</td>
                      <td>{file.accountsAcceptTaplinkWithSite}</td>
                      <td>{file.accountsAcceptTaplinkMultipage}</td>
                      <td>{file.accountsSent}</td>
                      <td className="td-red">{file.accountsDeniedCount}</td>
                      {getFileStatus(
                        file.status,
                        file.accountsPendingProcessingCount,
                        file._id,
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          ''
        )}
      </div>
    );
}
  // {
  //   data.map((account) => {
  //     return (
  //       <tr>
  //         {/* <td>{el.login}</td>
  //                         <td>{el.title}</td>
  //                         <td>{el.phone}</td>
  //                         <td>{el.email}</td>
  //                         <td>{el.description}</td> */}
  //         <td>
  //           <ol>
  //             {account.links.parsedLinks.map((el, i) => {
  //               var color = 'red';
  //               if (account?.links?.filterLinks.indexOf(el) !== -1)
  //                 color = 'black';
  //               else if (account?.messengers?.whatsApp.indexOf(el) !== -1)
  //                 color = 'green';
  //               else if (account?.messengers?.telegram.indexOf(el) !== -1)
  //                 color = 'blue';
  //               else if (account?.messengers?.viber.indexOf(el) !== -1)
  //                 color = 'rgb(235, 53, 235)';
  //               return (
  //                 <li
  //                   style={{
  //                     color: color,
  //                     fontWeight: 500,
  //                     whiteSpace: 'nowrap',
  //                   }}>
  //                   {el}
  //                 </li>
  //               );
  //             })}
  //           </ol>
  //         </td>
  //         <td>
  //           <ol>
  //             {account.Category.map((el, i) => {
  //               return <li>{el}</li>;
  //             })}
  //           </ol>
  //         </td>
  //         {/* <td>
  //                           <ol>
  //                             {el.links.filterLinks.map((el, i) => {
  //                               return (
  //                                 <li style={{ whiteSpace: 'nowrap' }}>
  //                                   {el.slice(0, 40)}
  //                                 </li>
  //                               );
  //                             })}
  //                           </ol>
  //                         </td>
  //                         <td>
  //                           <ol>
  //                             {el.messengers.whatsApp.map((el, i) => {
  //                               return (
  //                                 <li style={{ whiteSpace: 'nowrap' }}>
  //                                   {el.slice(0, 40)}
  //                                 </li>
  //                               );
  //                             })}
  //                           </ol>
  //                         </td>
  //                         <td>
  //                           <ol>
  //                             {el.messengers.telegram.map((el, i) => {
  //                               return (
  //                                 <li style={{ whiteSpace: 'nowrap' }}>
  //                                   {el.slice(0, 40)}
  //                                 </li>
  //                               );
  //                             })}
  //                           </ol>
  //                         </td>
  //                         <td>
  //                           <ol>
  //                             {el.messengers.viber.map((el, i) => {
  //                               return (
  //                                 <li style={{ whiteSpace: 'nowrap' }}>
  //                                   {el.slice(0, 40)}
  //                                 </li>
  //                               );
  //                             })}
  //                           </ol>
  //                         </td> */}
  //       </tr>
  //     );
  //   });
  // }