#Россия 2030
Прототип онлайн проекта, который позволит думающей и небезразличной части Российского общества просто и продуктивно дискутировать на тему позитивного будущего страны и как к нему прийти.

Доступно в онлайн по адресу: http://www.ru2030.meteor.com

##Логика
Все, что есть на сайте - это коллаборативные списки.
Три ключевых списка, создаваемые при запуске:
* Россия 2030: В какой России я хотел бы жить (список характеристик)
* Программа: Что для этого нужно сделать (список действий)
* Лидеры: Кто может это осуществить (список лидеров)

Каждый список идентичен по функционалу:
* Можно добавлять элементы (text + links)
* Тот кто добавил элемент - может его изменить или удалить
* Можно следить за элементами (получать нотификации в случае изменений и комментариев)
* Голосовать за элементы (+1 / -1)
* Обсуждать элементы: добавлять комментарии и голосовать за комментарии (+1 / -1)
* Добавлять к элементам тэги
* Элементы с наиболее высоким рейтингом показываются выше. Элементы с рейтингом меньше "-10" не показываются

##Структура данных

###Key State Variables (in Session)
* currentView (admin, settings, list, item, 404...)
* currentList (currentList object)
* currentItem (currentItem object)

###DB.Users:
* _id
* profile.name, email, password etc.
* email (onUserCreate - always copy email here for easy access)
* services.facebook. ... - social login details
* userSettings (display name, subscription (watch) logic etc.)
* userRole (user / admin / superAdmin etc.)
* displayName (how the user is called on the website)

###DB.Lists:
* _id
* name (string, name in english, url friendly)
* displayName (string in any language, for display as a name)
* description
* timestamp
* by (id of the user who created this list)
* watchers (array of ids of users watching this whole list)
* halfSentence (false or the part of the sentence that users are asked to continue);

###DB.Items:
* _id
* belongsTo (id of the list it belongs to)
* content
* rating (number that equals plusOnes.length - minuOnes.length)
* flags (number - how many times this item has been flagged)
* plusOnes (array of userIds of users who voted up)
* minusOnes (array of userIds of users who voted down)
* lastEdited (last edited timestamp)
* by (id of the user who submitted it)
* moderators (array of ids of users allowed to moderate this list)
* watchers (array of ids of users watching this item)

###DB.Comments:
* _id
* content
* belongsTo (id of the Item this comment belongs to)
* inResponseTo (false or id of the comment this comment is a response to. for nested comments)
* rating (plusOnes.length - minusOnes.length)
* plusOnes (array of userIds of users who voted up)
* minusOnes (array of userIds of users who voted down)
* timeStamp (last edited timestamp)
* by (id of the user who submitted it)

##Технологии для прототипа
* Bootstrap + jQuery + Backbone(router)
* Meteor stack (node.js, mongo, fibers...)
* Mailgun (transactional email)

##Ограничения версии 0.1.
* Логин только FB
* Нет никакой публикации внаружу (в фейсбук что я добавил или проголосовал)
* Нет "слежки" за топиками и ни за чем остальным

##nextUp
* admin tool to delete certain items and comments individually. don't forget to delete comments corresponding to items when deleting items.
* basic pagination for comments and items ("load more" button based on session variable ("currentLimit")) - don't forget to make it go back to "10" whenever router is called or sortBy is changed
* search on the main page (items + comments) + pagination for search results (same session variable)
* basic watch logic (send email when the item I'm watching is commented)
* threaded comments (make sure there is maxLevel)

##knownBugs
* flashing in Firefox (template-rerendering when going through the router)
* bad UI for voting (if an item moves up instantly from under you)

##На будущее
* интеграция Disqus.com для комментариев (?)
* интеграция gravatar для иконок
